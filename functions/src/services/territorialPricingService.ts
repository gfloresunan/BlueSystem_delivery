import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { normalizeGeoLocationStrict, getMunicipalityById } from "../domain/geo/geoCatalog";

/**
 * BlueSystem Delivery Enterprise — SSOT Políticas Territoriales Municipales
 * Protocolo: BSD-TERRITORIAL-MUNICIPAL-PRICING-POLICY-001 (Fase 1)
 */

export type PricingMode = "DISTANCE" | "FLAT";

export interface TerritorialPricingPolicy {
  policyId: string;
  countryCode: string;
  departmentId: string;
  departmentName: string;
  municipalityId: string;
  municipalityName: string;
  pricingMode: PricingMode;
  fixedDeliveryFee: number | null;
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
  fixedDeliveryFee: number | null;
  currency: string;
  isApplied: boolean;
  departmentId?: string;
  municipalityId?: string;
  countryCode?: string;
  fallbackReason?: string;
}

export interface ResolveTerritorialOptions {
  bypassCache?: boolean;
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
        policy = {
          policyId: data.policyId || docSnap.id,
          countryCode: (data.countryCode || "NI").toString().toUpperCase(),
          departmentId: (data.departmentId || departmentId).toString().toUpperCase(),
          departmentName: data.departmentName || geo.departmentName,
          municipalityId: (data.municipalityId || municipalityId).toString().toUpperCase(),
          municipalityName: data.municipalityName || geo.municipalityName,
          pricingMode: (data.pricingMode === "FLAT" ? "FLAT" : "DISTANCE") as PricingMode,
          fixedDeliveryFee: typeof data.fixedDeliveryFee === "number" ? data.fixedDeliveryFee : null,
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
      currency: policy.currency,
      isApplied: false,
      departmentId,
      municipalityId,
      fallbackReason: "MODE_IS_DISTANCE",
    };
  }

  // 3. Modo FLAT con validación Fail-Safe estricta
  if (policy.pricingMode === "FLAT") {
    const fee = policy.fixedDeliveryFee;
    if (typeof fee === "number" && !isNaN(fee) && fee > 0) {
      const roundedFee = Math.round(fee * 100) / 100;
      return {
        pricingMode: "FLAT",
        policyId: policy.policyId,
        pricingPolicyVersion: policy.version,
        fixedDeliveryFee: roundedFee,
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
    currency: "NIO",
    isApplied: false,
    departmentId,
    municipalityId,
    fallbackReason: "DEFAULT_FALLBACK",
  };
}
