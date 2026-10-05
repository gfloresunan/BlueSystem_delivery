"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTerritorialPolicyId = buildTerritorialPolicyId;
exports.clearTerritorialPolicyCache = clearTerritorialPolicyCache;
exports.resolveTerritorialPricingPolicy = resolveTerritorialPricingPolicy;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const POLICY_CACHE = new Map();
// Hardened TTL: 15s para cotizaciones efímeras (evita sobrecosto Firestore en ráfagas), garantizando rollback en <= 15s
const CACHE_TTL_MS = 15 * 1000;
const NEGATIVE_CACHE_TTL_MS = 10 * 1000;
/**
 * Construye el identificador canónico e inmutable de la política territorial.
 * Formato oficial: NI_{departmentId}_{municipalityId}
 */
function buildTerritorialPolicyId(countryCode, departmentId, municipalityId) {
    const c = (countryCode || "NI").trim().toUpperCase();
    const d = (departmentId || "").trim().toUpperCase();
    const m = (municipalityId || "").trim().toUpperCase();
    return `${c}_${d}_${m}`;
}
/**
 * Invalida la caché en memoria de políticas territoriales.
 */
function clearTerritorialPolicyCache() {
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
async function resolveTerritorialPricingPolicy(departmentInput, municipalityInput, options) {
    const defaultFallback = {
        pricingMode: "DISTANCE",
        policyId: null,
        pricingPolicyVersion: null,
        fixedDeliveryFee: null,
        currency: "NIO",
        isApplied: false,
        fallbackReason: "NO_MUNICIPALITY_SPECIFIED",
    };
    // Normalización geográfica estricta con el catálogo oficial
    let geo = (0, geoCatalog_1.normalizeGeoLocationStrict)(departmentInput, municipalityInput);
    if (!geo && municipalityInput) {
        const byMuni = (0, geoCatalog_1.getMunicipalityById)(municipalityInput);
        if (byMuni) {
            geo = (0, geoCatalog_1.normalizeGeoLocationStrict)(byMuni.departmentId, byMuni.id);
        }
    }
    if (!geo || !geo.departmentId || !geo.municipalityId) {
        return defaultFallback;
    }
    const { departmentId, municipalityId } = geo;
    const policyId = buildTerritorialPolicyId("NI", departmentId, municipalityId);
    const now = Date.now();
    const bypassCache = (options === null || options === void 0 ? void 0 : options.bypassCache) === true;
    // 1. Verificación de Caché en Memoria (se omite si bypassCache es true)
    const cached = bypassCache ? null : POLICY_CACHE.get(policyId);
    let policy = null;
    if (cached && cached.expiresAt > now) {
        policy = cached.policy;
    }
    else {
        try {
            const db = admin.firestore();
            const docSnap = await db.collection("territorial_pricing_policies").doc(policyId).get();
            if (!docSnap.exists) {
                POLICY_CACHE.set(policyId, { policy: null, expiresAt: now + NEGATIVE_CACHE_TTL_MS });
                policy = null;
            }
            else {
                const data = docSnap.data() || {};
                policy = {
                    policyId: data.policyId || docSnap.id,
                    countryCode: (data.countryCode || "NI").toString().toUpperCase(),
                    departmentId: (data.departmentId || departmentId).toString().toUpperCase(),
                    departmentName: data.departmentName || geo.departmentName,
                    municipalityId: (data.municipalityId || municipalityId).toString().toUpperCase(),
                    municipalityName: data.municipalityName || geo.municipalityName,
                    pricingMode: (data.pricingMode === "FLAT" ? "FLAT" : "DISTANCE"),
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
        }
        catch (err) {
            functions.logger.warn(`[TERRITORIAL_PRICING] Error leyendo política para ${policyId}, aplicando fallback seguro DISTANCE:`, (err === null || err === void 0 ? void 0 : err.message) || err);
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
        }
        else {
            functions.logger.warn(`[TERRITORIAL_PRICING] Política FLAT con fixedDeliveryFee inválido (${fee}) para ${policyId}. Aplicando fail-safe DISTANCE.`);
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
//# sourceMappingURL=territorialPricingService.js.map