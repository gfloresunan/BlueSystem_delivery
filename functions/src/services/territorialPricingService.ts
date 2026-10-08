import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { normalizeGeoLocationStrict, getMunicipalityById } from "../domain/geo/geoCatalog";
import { validatePointInUrbanCore } from "./municipalGeoIntegrityService";

/**
 * BlueSystem Delivery Enterprise — SSOT Políticas Territoriales Municipales
 * Protocolo: BSD-TERRITORIAL-FLAT-PRICING-3LEVEL-ADMIN-001
 */

export type PricingMode = "DISTANCE" | "FLAT" | "TERRITORIAL_FLAT";

export type TerritorialPricingLevel = "URBAN_CORE" | "MUNICIPAL_OUTER" | "INTER_MUNICIPAL";

export interface UrbanCoreLevelConfig {
  enabled: boolean;
  customerFlatFee: number;
  courierFlatEarning: number;
  zoneId?: string;
}

export interface MunicipalOuterLevelConfig {
  enabled: boolean;
  customerFlatFee: number;
  courierFlatEarning: number;
}

export interface InterMunicipalRouteConfig {
  enabled: boolean;
  customerFlatFee: number;
  courierFlatEarning: number;
  destinationDepartmentId?: string;
  destinationMunicipalityName?: string;
}

export interface TerritorialPricingPolicyLevels {
  urbanCore?: UrbanCoreLevelConfig;
  municipalOuter?: MunicipalOuterLevelConfig;
}

export interface TerritorialPricingPolicy {
  policyId: string;
  countryCode: string;
  departmentId: string;
  departmentName: string;
  municipalityId: string;
  municipalityName: string;
  pricingMode: PricingMode;
  fixedDeliveryFee?: number | null;
  courierFlatEarning?: number | null;
  levels?: TerritorialPricingPolicyLevels;
  interMunicipalRoutes?: Record<string, InterMunicipalRouteConfig>;
  currency: string;
  isActive: boolean;
  version: number;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface TerritorialPricingResolution {
  pricingMode: PricingMode;
  policyId: string | null;
  pricingPolicyVersion: number | null;
  fixedDeliveryFee: number | null; // Tarifa fija del cliente
  courierFlatEarning: number | null; // Ganancia fija del motorizado
  territorialLevel?: TerritorialPricingLevel | null;
  interMunicipalRouteId?: string | null;
  currency: string;
  isApplied: boolean;
  departmentId?: string;
  municipalityId?: string;
  destinationDepartmentId?: string;
  destinationMunicipalityId?: string;
  countryCode?: string;
  fallbackReason?: string;
}

export interface ResolveTerritorialOptions {
  bypassCache?: boolean;
  destinationDepartmentInput?: string | null;
  destinationMunicipalityInput?: string | null;
  destinationCoordinates?: { latitude: number; longitude: number } | null;
  originCoordinates?: { latitude: number; longitude: number } | null;
}

interface CacheEntry {
  policy: TerritorialPricingPolicy | null;
  expiresAt: number;
}

const POLICY_CACHE = new Map<string, CacheEntry>();
// Hardened TTL: 15s para cotizaciones efímeras (evita sobrecosto Firestore en ráfagas), garantizando rollback en <= 15s
const CACHE_TTL_MS = 15 * 1000;
const NEGATIVE_CACHE_TTL_MS = 10 * 1000;

/**
 * Construye el identificador canónico e inmutable de la política territorial.
 * Formato oficial: NI_{departmentId}_{municipalityId}
 */
export function buildTerritorialPolicyId(
  countryCode: string,
  departmentId: string,
  municipalityId: string
): string {
  const c = (countryCode || "NI").trim().toUpperCase();
  const d = (departmentId || "").trim().toUpperCase();
  const m = (municipalityId || "").trim().toUpperCase();
  return `${c}_${d}_${m}`;
}

/**
 * Invalida la caché en memoria de políticas territoriales.
 */
export function clearTerritorialPolicyCache(): void {
  POLICY_CACHE.clear();
}

/**
 * Resuelve la política de tarifación territorial autoritativa para un municipio.
 * Invariante de Fallback:
 *  - Sin documento -> DISTANCE
 *  - isActive == false -> DISTANCE
 *  - pricingMode == DISTANCE -> DISTANCE
 *  - pricingMode == FLAT + tarifa válida (>0) -> FLAT
 *  - pricingMode == FLAT + tarifa inválida/null/<=0 -> DISTANCE (Fail-Safe, nunca C$ 0)
 *  - Error de lectura -> DISTANCE (Fail-Safe)
 *
 * @param departmentInput ID o nombre de departamento
 * @param municipalityInput ID o nombre de municipio
 * @param options Opciones de resolución (bypassCache: true para lectura directa en creación de órdenes)
 */
export async function resolveTerritorialPricingPolicy(
  departmentInput?: string | null,
  municipalityInput?: string | null,
  options?: ResolveTerritorialOptions
): Promise<TerritorialPricingResolution> {
  const defaultFallback: TerritorialPricingResolution = {
    pricingMode: "DISTANCE",
    policyId: null,
    pricingPolicyVersion: null,
    fixedDeliveryFee: null,
    courierFlatEarning: null,
    currency: "NIO",
    isApplied: false,
    fallbackReason: "NO_MUNICIPALITY_SPECIFIED",
  };

  // Normalización geográfica estricta con el catálogo oficial
  let geo = normalizeGeoLocationStrict(departmentInput, municipalityInput);
  if (!geo && municipalityInput) {
    const byMuni = getMunicipalityById(municipalityInput);
    if (byMuni) {
      geo = normalizeGeoLocationStrict(byMuni.departmentId, byMuni.id);
    }
  }

  if (!geo || !geo.departmentId || !geo.municipalityId) {
    return defaultFallback;
  }

  const { departmentId, municipalityId } = geo;
  const policyId = buildTerritorialPolicyId("NI", departmentId, municipalityId);
  const now = Date.now();
  const bypassCache = options?.bypassCache === true;

  // 1. Verificación de Caché en Memoria (se omite si bypassCache es true)
  const cached = bypassCache ? null : POLICY_CACHE.get(policyId);
  let policy: TerritorialPricingPolicy | null = null;

  if (cached && cached.expiresAt > now) {
    policy = cached.policy;
  } else {
    try {
      const db = admin.firestore();
      const docSnap = await db.collection("territorial_pricing_policies").doc(policyId).get();

      if (!docSnap.exists) {
        POLICY_CACHE.set(policyId, { policy: null, expiresAt: now + NEGATIVE_CACHE_TTL_MS });
        policy = null;
      } else {
        const data = docSnap.data() || {};
        const rawMode = (data.pricingMode || "").toString().toUpperCase();
        const mode: PricingMode = rawMode === "TERRITORIAL_FLAT" ? "TERRITORIAL_FLAT" : (rawMode === "FLAT" ? "FLAT" : "DISTANCE");

        policy = {
          policyId: data.policyId || docSnap.id,
          countryCode: (data.countryCode || "NI").toString().toUpperCase(),
          departmentId: (data.departmentId || departmentId).toString().toUpperCase(),
          departmentName: data.departmentName || geo.departmentName,
          municipalityId: (data.municipalityId || municipalityId).toString().toUpperCase(),
          municipalityName: data.municipalityName || geo.municipalityName,
          pricingMode: mode,
          fixedDeliveryFee: typeof data.fixedDeliveryFee === "number" ? data.fixedDeliveryFee : null,
          courierFlatEarning: typeof data.courierFlatEarning === "number" ? data.courierFlatEarning : null,
          levels: data.levels || undefined,
          interMunicipalRoutes: data.interMunicipalRoutes || undefined,
          currency: (data.currency || "NIO").toString().toUpperCase(),
          isActive: Boolean(data.isActive),
          version: Number(data.version || 1),
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        };
        POLICY_CACHE.set(policyId, { policy, expiresAt: now + CACHE_TTL_MS });
      }
    } catch (err: any) {
      functions.logger.warn(
        `[TERRITORIAL_PRICING] Error leyendo política para ${policyId}, aplicando fallback seguro DISTANCE:`,
        err?.message || err
      );
      return {
        pricingMode: "DISTANCE",
        policyId: null,
        pricingPolicyVersion: null,
        fixedDeliveryFee: null,
        courierFlatEarning: null,
        currency: "NIO",
        isApplied: false,
        departmentId,
        municipalityId,
        fallbackReason: "FIRESTORE_ERROR_FAILSAFE",
      };
    }
  }

  // 2. Evaluación de Invariantes de Fallback
  if (!policy) {
    return {
      pricingMode: "DISTANCE",
      policyId: null,
      pricingPolicyVersion: null,
      fixedDeliveryFee: null,
      courierFlatEarning: null,
      currency: "NIO",
      isApplied: false,
      departmentId,
      municipalityId,
      fallbackReason: "NO_POLICY_DOCUMENT",
    };
  }

  if (!policy.isActive) {
    return {
      pricingMode: "DISTANCE",
      policyId: policy.policyId,
      pricingPolicyVersion: policy.version,
      fixedDeliveryFee: null,
      courierFlatEarning: null,
      currency: policy.currency,
      isApplied: false,
      departmentId,
      municipalityId,
      fallbackReason: "POLICY_INACTIVE",
    };
  }

  if (policy.pricingMode === "DISTANCE") {
    return {
      pricingMode: "DISTANCE",
      policyId: policy.policyId,
      pricingPolicyVersion: policy.version,
      fixedDeliveryFee: null,
      courierFlatEarning: null,
      currency: policy.currency,
      isApplied: false,
      departmentId,
      municipalityId,
      fallbackReason: "MODE_IS_DISTANCE",
    };
  }

  // 3. Modo TERRITORIAL_FLAT (3 Niveles: Urban Core, Municipal Outer, Authorized Inter-Municipal)
  if (policy.pricingMode === "TERRITORIAL_FLAT" || (policy.pricingMode === "FLAT" && (policy.levels || policy.interMunicipalRoutes))) {
    let destMuniId = municipalityId;
    let destDeptId = departmentId;
    if (options?.destinationMunicipalityInput) {
      const destGeo = normalizeGeoLocationStrict(options.destinationDepartmentInput, options.destinationMunicipalityInput);
      if (destGeo) {
        destMuniId = destGeo.municipalityId;
        destDeptId = destGeo.departmentId;
      } else {
        const byMuni = getMunicipalityById(options.destinationMunicipalityInput);
        if (byMuni) {
          destMuniId = byMuni.id;
          destDeptId = byMuni.departmentId;
        }
      }
    }

    // ── NIVEL 3: INTER_MUNICIPAL (Municipios Cercanos Autorizados) ──
    if (destMuniId !== municipalityId) {
      const route = policy.interMunicipalRoutes?.[destMuniId];
      if (route && route.enabled === true && typeof route.customerFlatFee === "number" && route.customerFlatFee > 0) {
        const cFee = Math.round(route.customerFlatFee * 100) / 100;
        const cEarn = typeof route.courierFlatEarning === "number" && route.courierFlatEarning > 0
          ? Math.round(route.courierFlatEarning * 100) / 100
          : cFee;

        return {
          pricingMode: "TERRITORIAL_FLAT",
          policyId: policy.policyId,
          pricingPolicyVersion: policy.version,
          fixedDeliveryFee: cFee,
          courierFlatEarning: cEarn,
          territorialLevel: "INTER_MUNICIPAL",
          interMunicipalRouteId: `${municipalityId}->${destMuniId}`,
          currency: policy.currency || "NIO",
          isApplied: true,
          departmentId,
          municipalityId,
          destinationDepartmentId: destDeptId,
          destinationMunicipalityId: destMuniId,
          countryCode: policy.countryCode || "NI",
        };
      } else {
        // Ruta intermunicipal NO autorizada -> Fail-closed: CROSS_CITY_ORDER_BLOCKED
        return {
          pricingMode: "DISTANCE",
          policyId: policy.policyId,
          pricingPolicyVersion: policy.version,
          fixedDeliveryFee: null,
          courierFlatEarning: null,
          currency: policy.currency || "NIO",
          isApplied: false,
          departmentId,
          municipalityId,
          destinationDepartmentId: destDeptId,
          destinationMunicipalityId: destMuniId,
          fallbackReason: "INTER_MUNICIPAL_ROUTE_NOT_AUTHORIZED",
        };
      }
    }

    // ── NIVELES 1 Y 2: INTRAMUNICIPAL (Casco Urbano vs Resto del Municipio) ──
    let inUrbanCore = true;
    if (options?.destinationCoordinates) {
      inUrbanCore = await validatePointInUrbanCore({
        countryCode: policy.countryCode,
        departmentId,
        municipalityId,
        latitude: options.destinationCoordinates.latitude,
        longitude: options.destinationCoordinates.longitude,
        bypassCache,
      });
    }

    // NIVEL 1 — URBAN_CORE (Casco Urbano)
    if (inUrbanCore) {
      const uc = policy.levels?.urbanCore;
      const cFee = (uc && uc.enabled !== false && typeof uc.customerFlatFee === "number" && uc.customerFlatFee > 0)
        ? Math.round(uc.customerFlatFee * 100) / 100
        : (typeof policy.fixedDeliveryFee === "number" && policy.fixedDeliveryFee > 0 ? Math.round(policy.fixedDeliveryFee * 100) / 100 : null);

      if (cFee !== null) {
        const cEarn = (uc && typeof uc.courierFlatEarning === "number" && uc.courierFlatEarning > 0)
          ? Math.round(uc.courierFlatEarning * 100) / 100
          : (typeof policy.courierFlatEarning === "number" && policy.courierFlatEarning > 0 ? Math.round(policy.courierFlatEarning * 100) / 100 : cFee);

        return {
          pricingMode: "TERRITORIAL_FLAT",
          policyId: policy.policyId,
          pricingPolicyVersion: policy.version,
          fixedDeliveryFee: cFee,
          courierFlatEarning: cEarn,
          territorialLevel: "URBAN_CORE",
          currency: policy.currency || "NIO",
          isApplied: true,
          departmentId,
          municipalityId,
          countryCode: policy.countryCode || "NI",
        };
      } else {
        return {
          pricingMode: "DISTANCE",
          policyId: policy.policyId,
          pricingPolicyVersion: policy.version,
          fixedDeliveryFee: null,
          courierFlatEarning: null,
          currency: policy.currency || "NIO",
          isApplied: false,
          departmentId,
          municipalityId,
          fallbackReason: "URBAN_CORE_DISABLED_OR_INVALID",
        };
      }
    } else {
      // NIVEL 2 — MUNICIPAL_OUTER (Afueras / Resto del Municipio)
      const mo = policy.levels?.municipalOuter;
      if (mo && mo.enabled === true && typeof mo.customerFlatFee === "number" && mo.customerFlatFee > 0) {
        const cFee = Math.round(mo.customerFlatFee * 100) / 100;
        const cEarn = typeof mo.courierFlatEarning === "number" && mo.courierFlatEarning > 0
          ? Math.round(mo.courierFlatEarning * 100) / 100
          : cFee;

        return {
          pricingMode: "TERRITORIAL_FLAT",
          policyId: policy.policyId,
          pricingPolicyVersion: policy.version,
          fixedDeliveryFee: cFee,
          courierFlatEarning: cEarn,
          territorialLevel: "MUNICIPAL_OUTER",
          currency: policy.currency || "NIO",
          isApplied: true,
          departmentId,
          municipalityId,
          countryCode: policy.countryCode || "NI",
        };
      } else {
        return {
          pricingMode: "DISTANCE",
          policyId: policy.policyId,
          pricingPolicyVersion: policy.version,
          fixedDeliveryFee: null,
          courierFlatEarning: null,
          currency: policy.currency || "NIO",
          isApplied: false,
          departmentId,
          municipalityId,
          fallbackReason: "MUNICIPAL_OUTER_LEVEL_DISABLED",
        };
      }
    }
  }

  // 4. Modo FLAT Legacy (Compatibilidad con V1 sin niveles desglosados)
  if (policy.pricingMode === "FLAT") {
    const fee = policy.fixedDeliveryFee;
    if (typeof fee === "number" && !isNaN(fee) && fee > 0) {
      const roundedFee = Math.round(fee * 100) / 100;
      const courierEarn = typeof policy.courierFlatEarning === "number" && policy.courierFlatEarning > 0
        ? Math.round(policy.courierFlatEarning * 100) / 100
        : null;

      return {
        pricingMode: "FLAT",
        policyId: policy.policyId,
        pricingPolicyVersion: policy.version,
        fixedDeliveryFee: roundedFee,
        courierFlatEarning: courierEarn,
        territorialLevel: "URBAN_CORE",
        currency: policy.currency || "NIO",
        isApplied: true,
        departmentId,
        municipalityId,
        countryCode: policy.countryCode || "NI",
      };
    } else {
      functions.logger.warn(
        `[TERRITORIAL_PRICING] Política FLAT con fixedDeliveryFee inválido (${fee}) para ${policyId}. Aplicando fail-safe DISTANCE.`
      );
      return {
        pricingMode: "DISTANCE",
        policyId: policy.policyId,
        pricingPolicyVersion: policy.version,
        fixedDeliveryFee: null,
        courierFlatEarning: null,
        currency: policy.currency || "NIO",
        isApplied: false,
        departmentId,
        municipalityId,
        fallbackReason: "INVALID_FLAT_FEE_FAILSAFE",
      };
    }
  }

  // Default Inmutable
  return {
    pricingMode: "DISTANCE",
    policyId: policy.policyId,
    pricingPolicyVersion: policy.version,
    fixedDeliveryFee: null,
    courierFlatEarning: null,
    currency: "NIO",
    isApplied: false,
    departmentId,
    municipalityId,
    fallbackReason: "DEFAULT_FALLBACK",
  };
}
