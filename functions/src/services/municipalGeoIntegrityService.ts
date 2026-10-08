import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint, polygon as turfPolygon, multiPolygon as turfMultiPolygon } from "@turf/helpers";
import { normalizeGeoLocationStrict } from "../domain/geo/geoCatalog";
import * as crypto from "crypto";

import { BoundingBox, MunicipalBoundary } from "../domain/geo/boundaries/types";
import { CIUDAD_DARIO_BOUNDARY } from "../domain/geo/boundaries/ciudadDario";
import { CIUDAD_DARIO_URBAN_CORE_BOUNDARY } from "../domain/geo/boundaries/ciudadDarioUrbanCore";
import { SEBACO_BOUNDARY } from "../domain/geo/boundaries/sebaco";

export { BoundingBox, MunicipalBoundary };

export type GeoValidationStatus =
  | "VERIFIED"
  | "OUTSIDE_MUNICIPALITY"
  | "BOUNDARY_UNAVAILABLE"
  | "INVALID_COORDINATES"
  | "MUNICIPALITY_MISMATCH";

export interface GeoValidationResult {
  valid: boolean;
  status: GeoValidationStatus;
  declaredMunicipalityId: string;
  resolvedMunicipalityId?: string;
  boundaryVersion?: string;
  validationMethod: "POINT_IN_POLYGON" | "BOUNDING_BOX_PRECHECK" | "BYPASS_UNENFORCED";
  checkedAt: string;
  details?: {
    countryCode?: string;
    departmentId?: string;
    latitude?: number;
    longitude?: number;
    inBoundingBox?: boolean;
    geometryType?: string;
    errorReason?: string;
  };
}

export interface ValidatePointOptions {
  countryCode?: string;
  departmentId?: string;
  municipalityId: string;
  latitude: number;
  longitude: number;
  bypassCache?: boolean;
  isFlatRequired?: boolean;
}

export interface GeoIntegrityConfig {
  enabled: boolean;
  enforcementMode: "CANARY" | "NATIONAL";
  enforcedMunicipalities: string[];
}

interface CacheEntry {
  boundary: MunicipalBoundary | null;
  expiresAt: number;
}

// In-Memory Boundary Cache (15 minutos de TTL)
const BOUNDARY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function clearBoundaryCache(): void {
  BOUNDARY_CACHE.clear();
}

/**
 * Normaliza la clave canónica del boundary: {countryCode}_{departmentId}_{municipalityId}
 */
export function buildBoundaryId(countryCode: string, departmentId: string, municipalityId: string): string {
  const c = (countryCode || "NI").trim().toUpperCase();
  const d = (departmentId || "").trim().toUpperCase();
  const m = (municipalityId || "").trim().toUpperCase();
  return `${c}_${d}_${m}`;
}

/**
 * Obtiene la configuración de Geo Integrity desde /system_config/global
 */
export async function getGeoIntegrityConfig(): Promise<GeoIntegrityConfig> {
  const defaultCfg: GeoIntegrityConfig = {
    enabled: true,
    enforcementMode: "CANARY",
    enforcedMunicipalities: ["CIUDAD_DARIO"],
  };

  if (admin.apps.length > 0) {
    try {
      const doc = await admin.firestore().collection("system_config").doc("global").get();
      if (doc.exists) {
        const data = doc.data() || {};
        const geoCfg = data.commerceDeliveryGeoIntegrity;
        if (geoCfg && typeof geoCfg === "object") {
          return {
            enabled: geoCfg.enabled !== false,
            enforcementMode: geoCfg.enforcementMode === "NATIONAL" ? "NATIONAL" : "CANARY",
            enforcedMunicipalities: Array.isArray(geoCfg.enforcedMunicipalities)
              ? geoCfg.enforcedMunicipalities.map((m: any) => String(m).trim().toUpperCase())
              : ["CIUDAD_DARIO"],
          };
        }
      }
    } catch (err) {
      functions.logger.warn("[GEO_INTEGRITY] Error leyendo system_config/global. Usando default CANARY:", err);
    }
  }

  return defaultCfg;
}

/**
 * Carga el boundary municipal autoritativo desde caché en memoria, Firestore o archivo seed local.
 */
export async function loadMunicipalBoundary(
  departmentId: string,
  municipalityId: string,
  countryCode = "NI"
): Promise<MunicipalBoundary | null> {
  const canonicalId = buildBoundaryId(countryCode, departmentId, municipalityId);
  const now = Date.now();

  const cached = BOUNDARY_CACHE.get(canonicalId);
  if (cached && cached.expiresAt > now) {
    return cached.boundary;
  }

  // 1. Intentar leer de Firestore colección /municipal_geo_boundaries/{boundaryId}
  if (admin.apps.length > 0) {
    try {
      const doc = await admin.firestore().collection("municipal_geo_boundaries").doc(canonicalId).get();
      if (doc.exists) {
        const bData = doc.data() as any;
        if (bData && bData.isActive !== false) {
          let geometry = bData.geometry;
          if (!geometry && bData.geometryGeoJson) {
            try {
              geometry = JSON.parse(bData.geometryGeoJson);
            } catch (pErr) {}
          }
          if (geometry) {
            const boundary: MunicipalBoundary = {
              ...bData,
              geometry,
            };
            BOUNDARY_CACHE.set(canonicalId, { boundary, expiresAt: now + CACHE_TTL_MS });
            return boundary;
          }
        }
      }
    } catch (err) {
      functions.logger.warn(`[GEO_INTEGRITY] Advertencia al leer Firestore para ${canonicalId}:`, err);
    }
  }

  // 2. Fallback a Seed local versionado si es Ciudad Darío o Sébaco
  if (canonicalId === "NI_MATAGALPA_CIUDAD_DARIO" || canonicalId === "NI_MATAGALPA_SEBACO") {
    const boundary: MunicipalBoundary =
      canonicalId === "NI_MATAGALPA_CIUDAD_DARIO" ? CIUDAD_DARIO_BOUNDARY : SEBACO_BOUNDARY;
    BOUNDARY_CACHE.set(canonicalId, { boundary, expiresAt: now + CACHE_TTL_MS });

    // Si no existía en Firestore, persistir automáticamente para diagnóstico administrativo
    if (admin.apps.length > 0) {
      const payload: any = {
        ...boundary,
        geometryGeoJson: JSON.stringify(boundary.geometry),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      delete payload.geometry; // Evita error de arrays anidados en Firestore

      admin.firestore().collection("municipal_geo_boundaries").doc(canonicalId).set(payload, { merge: true }).catch((pErr) => {
        functions.logger.warn(`[GEO_INTEGRITY] No se pudo guardar seed en Firestore:`, pErr);
      });
    }

    return boundary;
  }

  BOUNDARY_CACHE.set(canonicalId, { boundary: null, expiresAt: now + 30 * 1000 });
  return null;
}

/**
 * Pre-check rápido O(1) de Bounding Box.
 */
function isPointInBoundingBox(lat: number, lng: number, bbox: BoundingBox): boolean {
  return (
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lng >= bbox.minLng &&
    lng <= bbox.maxLng
  );
}

/**
 * Valida autoritativamente si un punto geográfico pertenece al municipio declarado.
 */
export async function validatePointInMunicipality(
  options: ValidatePointOptions
): Promise<GeoValidationResult> {
  const checkedAt = new Date().toISOString();
  const { latitude, longitude } = options;

  // 1. Sanity check de coordenadas
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return {
      valid: false,
      status: "INVALID_COORDINATES",
      declaredMunicipalityId: options.municipalityId || "",
      validationMethod: "POINT_IN_POLYGON",
      checkedAt,
      details: { errorReason: "NaN, null, undefined o coordenadas 0,0" },
    };
  }

  // 1.1 Inversión de coordenadas (latitud/longitud invertidas)
  // En Nicaragua, la latitud válida es positiva entre 10°N y 16°N; la longitud es negativa entre -82° y -89°W.
  if (latitude < 0 || longitude > 0) {
    return {
      valid: false,
      status: "INVALID_COORDINATES",
      declaredMunicipalityId: options.municipalityId || "",
      validationMethod: "POINT_IN_POLYGON",
      checkedAt,
      details: { errorReason: "Coordenadas invertidas o fuera del hemisferio (lat < 0 o lng > 0)" },
    };
  }

  // 2. Normalización de departamento y municipio
  const normalizedGeo = normalizeGeoLocationStrict(options.departmentId, options.municipalityId);
  const declaredMuni = normalizedGeo?.municipalityId || (options.municipalityId || "").trim().toUpperCase();
  const declaredDept = normalizedGeo?.departmentId || (options.departmentId || "MATAGALPA").trim().toUpperCase();
  const countryCode = (options.countryCode || "NI").trim().toUpperCase();

  // 3. Verificación de Feature Gate
  const config = await getGeoIntegrityConfig();
  const isEnforced =
    config.enabled &&
    (config.enforcementMode === "NATIONAL" || config.enforcedMunicipalities.includes(declaredMuni));

  // Invariante Canónico: Si se requiere tarifa FLAT, Geo Integrity es OBLIGATORIO sin excepción
  const requiresEnforcement = isEnforced || options.isFlatRequired === true;

  if (!requiresEnforcement) {
    return {
      valid: true,
      status: "VERIFIED",
      declaredMunicipalityId: declaredMuni,
      resolvedMunicipalityId: declaredMuni,
      validationMethod: "BYPASS_UNENFORCED",
      checkedAt,
    };
  }

  // 4. Cargar Boundary Municipal
  const boundary = await loadMunicipalBoundary(declaredDept, declaredMuni, countryCode);

  if (!boundary || !boundary.geometry) {
    // FAIL-CLOSED: Si está bajo enforcement y no hay boundary disponible
    return {
      valid: false,
      status: "BOUNDARY_UNAVAILABLE",
      declaredMunicipalityId: declaredMuni,
      validationMethod: "POINT_IN_POLYGON",
      checkedAt,
      details: {
        errorReason: `Boundary no configurado para ${countryCode}_${declaredDept}_${declaredMuni}`,
      },
    };
  }

  // 5. Pre-check O(1) de Bounding Box
  if (boundary.boundingBox && !isPointInBoundingBox(latitude, longitude, boundary.boundingBox)) {
    return {
      valid: false,
      status: "OUTSIDE_MUNICIPALITY",
      declaredMunicipalityId: declaredMuni,
      boundaryVersion: boundary.boundaryDatasetVersion,
      validationMethod: "BOUNDING_BOX_PRECHECK",
      checkedAt,
      details: {
        latitude,
        longitude,
        inBoundingBox: false,
      },
    };
  }

  // 6. Point-in-Polygon Robusto (GeoJSON usa [longitude, latitude])
  try {
    const pt = turfPoint([longitude, latitude]);
    let polyFeature: any;

    if (boundary.geometry.type === "Polygon") {
      polyFeature = turfPolygon(boundary.geometry.coordinates);
    } else if (boundary.geometry.type === "MultiPolygon") {
      polyFeature = turfMultiPolygon(boundary.geometry.coordinates);
    } else {
      throw new Error(`Tipo de geometría no soportada: ${(boundary.geometry as any).type}`);
    }

    // booleanPointInPolygon incluye vértices y contornos (boundary edges) de forma determinista
    const isInside = booleanPointInPolygon(pt, polyFeature, { ignoreBoundary: false });

    if (isInside) {
      return {
        valid: true,
        status: "VERIFIED",
        declaredMunicipalityId: declaredMuni,
        resolvedMunicipalityId: declaredMuni,
        boundaryVersion: boundary.boundaryDatasetVersion,
        validationMethod: "POINT_IN_POLYGON",
        checkedAt,
        details: {
          latitude,
          longitude,
          inBoundingBox: true,
          geometryType: boundary.geometry.type,
        },
      };
    } else {
      return {
        valid: false,
        status: "OUTSIDE_MUNICIPALITY",
        declaredMunicipalityId: declaredMuni,
        boundaryVersion: boundary.boundaryDatasetVersion,
        validationMethod: "POINT_IN_POLYGON",
        checkedAt,
        details: {
          latitude,
          longitude,
          inBoundingBox: true,
          geometryType: boundary.geometry.type,
        },
      };
    }
  } catch (err: any) {
    functions.logger.error(`[GEO_INTEGRITY_FAIL] Error en point-in-polygon para ${declaredMuni}:`, err);
    return {
      valid: false,
      status: "OUTSIDE_MUNICIPALITY",
      declaredMunicipalityId: declaredMuni,
      boundaryVersion: boundary.boundaryDatasetVersion,
      validationMethod: "POINT_IN_POLYGON",
      checkedAt,
      details: { errorReason: err?.message || String(err) },
    };
  }
}

/**
 * Obtiene el boundary del Casco Urbano (Urban Core) de un municipio.
 */
export async function getUrbanCoreBoundary(
  countryCode: string = "NI",
  departmentId: string,
  municipalityId: string,
  bypassCache: boolean = false
): Promise<MunicipalBoundary | null> {
  const baseId = buildBoundaryId(countryCode, departmentId, municipalityId);
  const canonicalId = `${baseId}_URBAN_CORE`;
  const now = Date.now();

  if (!bypassCache) {
    const cached = BOUNDARY_CACHE.get(canonicalId);
    if (cached && cached.expiresAt > now) {
      return cached.boundary;
    }
  }

  // 1. Consulta en Firestore /municipal_geo_boundaries/{canonicalId}
  if (admin.apps.length > 0) {
    try {
      const doc = await admin.firestore().collection("municipal_geo_boundaries").doc(canonicalId).get();
      if (doc.exists) {
        const bData = doc.data() as any;
        if (bData && bData.isActive !== false) {
          let geometry = bData.geometry;
          if (!geometry && bData.geometryGeoJson) {
            try {
              geometry = JSON.parse(bData.geometryGeoJson);
            } catch (pErr) {}
          }
          if (geometry) {
            const boundary: MunicipalBoundary = {
              ...bData,
              geometry,
            };
            BOUNDARY_CACHE.set(canonicalId, { boundary, expiresAt: now + CACHE_TTL_MS });
            return boundary;
          }
        }
      }
    } catch (err) {
      functions.logger.warn(`[GEO_INTEGRITY] Advertencia al leer Firestore para ${canonicalId}:`, err);
    }
  }

  // 2. Fallback a Seed local versionado para Ciudad Darío Casco Urbano
  if (canonicalId === "NI_MATAGALPA_CIUDAD_DARIO_URBAN_CORE") {
    const boundary: MunicipalBoundary = CIUDAD_DARIO_URBAN_CORE_BOUNDARY;
    BOUNDARY_CACHE.set(canonicalId, { boundary, expiresAt: now + CACHE_TTL_MS });

    if (admin.apps.length > 0) {
      const payload: any = {
        ...boundary,
        geometryGeoJson: JSON.stringify(boundary.geometry),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      delete payload.geometry;

      admin.firestore().collection("municipal_geo_boundaries").doc(canonicalId).set(payload, { merge: true }).catch((pErr) => {
        functions.logger.warn(`[GEO_INTEGRITY] No se pudo guardar seed de Casco Urbano en Firestore:`, pErr);
      });
    }

    return boundary;
  }

  BOUNDARY_CACHE.set(canonicalId, { boundary: null, expiresAt: now + 30 * 1000 });
  return null;
}

/**
 * Valida autoritativamente si un punto se encuentra dentro del Casco Urbano (Nivel 1 — Urban Core).
 */
export async function validatePointInUrbanCore(options: {
  countryCode?: string;
  departmentId?: string;
  municipalityId: string;
  latitude: number;
  longitude: number;
  bypassCache?: boolean;
}): Promise<boolean> {
  const { latitude, longitude } = options;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return false;
  }

  let dept = (options.departmentId || "").trim().toUpperCase();
  let muni = (options.municipalityId || "").trim().toUpperCase();
  const geo = normalizeGeoLocationStrict(dept, muni);
  if (geo) {
    dept = geo.departmentId;
    muni = geo.municipalityId;
  }

  const urbanBoundary = await getUrbanCoreBoundary(options.countryCode || "NI", dept, muni, options.bypassCache);
  if (!urbanBoundary || !urbanBoundary.geometry || !urbanBoundary.boundingBox) {
    return false;
  }

  // Fast precheck Bounding Box
  if (!isPointInBoundingBox(latitude, longitude, urbanBoundary.boundingBox)) {
    return false;
  }

  try {
    const pt = turfPoint([longitude, latitude]);
    let polyFeature: any;
    if (urbanBoundary.geometry.type === "Polygon") {
      polyFeature = turfPolygon(urbanBoundary.geometry.coordinates);
    } else if (urbanBoundary.geometry.type === "MultiPolygon") {
      polyFeature = turfMultiPolygon(urbanBoundary.geometry.coordinates);
    } else {
      return false;
    }

    return booleanPointInPolygon(pt, polyFeature, { ignoreBoundary: false });
  } catch (err) {
    functions.logger.warn(`[URBAN_CORE_CHECK_FAIL] Error evaluando point-in-polygon para Casco Urbano de ${muni}:`, err);
    return false;
  }
}

