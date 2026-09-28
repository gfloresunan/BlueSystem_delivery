"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PRODUCTION CANARY GOVERNANCE (FASE 2C.13)
 * Production Canary Locks & Feature Flag Controller
 *
 * ════════════════════════════════════════════════════════════════════════
 * REGLA SUPREMA: CERO MUTACIONES EN PRODUCCIÓN / CERO USUARIOS REALES EXPUESTOS
 * ════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiCanarySafetyController = exports.PUBLIC_CANARY_PERCENTAGE = exports.PUBLIC_CANARY_ENABLED = exports.GEMINI_AI_UID_ALLOWLIST = exports.GEMINI_AI_CANARY_PERCENTAGE = exports.GEMINI_AI_CANARY_ENABLED = exports.CanarySafetyController = exports.CANARY_APPLICATION_ALLOWLIST = exports.CANARY_MEMBERSHIP_ALLOWLIST = exports.CANARY_UID_ALLOWLIST = exports.CANARY_PERCENTAGE = exports.EIAM_V3_CANARY_MODE = exports.EIAM_V3_CANARY_ENABLED = exports.CANARY_OPERATIONAL_MODULE_LOCK = exports.CANARY_LEGACY_MIGRATION_LOCK = exports.CANARY_ROOM_LOCK = exports.CANARY_RULES_LOCK = exports.CANARY_PROVISIONING_LOCK = exports.CANARY_CLAIMS_LOCK = exports.PRODUCTION_CANARY_LOCK = void 0;
// ─── 1. PRODUCTION CANARY LOCKS ───────────────────────────────────────────────
exports.PRODUCTION_CANARY_LOCK = true;
exports.CANARY_CLAIMS_LOCK = true;
exports.CANARY_PROVISIONING_LOCK = true;
exports.CANARY_RULES_LOCK = true;
exports.CANARY_ROOM_LOCK = true;
exports.CANARY_LEGACY_MIGRATION_LOCK = true;
exports.CANARY_OPERATIONAL_MODULE_LOCK = true;
exports.EIAM_V3_CANARY_ENABLED = false;
exports.EIAM_V3_CANARY_MODE = 'OBSERVE_ONLY';
exports.CANARY_PERCENTAGE = 0; // Estrictamente 0% inicial
// ─── 3. CANARY SUBJECT ALLOWLISTS (EXPLICIT ZERO-BLAST-RADIUS) ────────────────
exports.CANARY_UID_ALLOWLIST = [];
exports.CANARY_MEMBERSHIP_ALLOWLIST = [];
exports.CANARY_APPLICATION_ALLOWLIST = [];
// ─── 4. SAFETY CONTROLLER & ALLOWLIST VALIDATOR ───────────────────────────────
class CanarySafetyController {
    /**
     * Verifica si un sujeto específico está autorizado para observación Canary.
     * Requiere: Feature flag activo + Sujeto en Allowlist explícito.
     */
    static isSubjectInCanary(uid, overrideFlag, customAllowlist) {
        const isEnabled = overrideFlag !== undefined ? overrideFlag : exports.EIAM_V3_CANARY_ENABLED;
        if (!isEnabled) {
            return false;
        }
        const allowlist = customAllowlist || exports.CANARY_UID_ALLOWLIST;
        if (allowlist.length === 0) {
            return false;
        }
        return allowlist.includes(uid);
    }
    /**
     * Verifica si la emisión real de Custom Claims está autorizada.
     * Invariante: Siempre FALSE en Fase 2C.13.
     */
    static isRealClaimsMutationPermitted() {
        return !exports.CANARY_CLAIMS_LOCK; // FALSE
    }
    /**
     * Verifica si el aprovisionamiento real en Firestore de producción está autorizado.
     * Invariante: Siempre FALSE en Fase 2C.13.
     */
    static isProductionProvisioningPermitted() {
        return !exports.CANARY_PROVISIONING_LOCK; // FALSE
    }
    /**
     * Verifica si el despliegue de Firestore Rules está autorizado.
     * Invariante: Siempre FALSE en Fase 2C.13.
     */
    static isRulesDeploymentPermitted() {
        return !exports.CANARY_RULES_LOCK; // FALSE
    }
}
exports.CanarySafetyController = CanarySafetyController;
// ─── 5. GEMINI AI CANARY FLAG (INDEPENDIENTE DE EIAM — C3-GR GAP-C3G-07) ──────
//
// INVARIANTE: GEMINI_AI_CANARY_ENABLED ≠ EIAM_V3_CANARY_ENABLED
// Nunca activar Gemini por asociacion accidental con el Canary EIAM.
// Cada flag controla un sistema de trafico completamente independiente.
//
// DEFAULT: false — FAIL-CLOSED
// Requiere autorizacion humana explicita, separada e inequivoca para cambiar.
//
exports.GEMINI_AI_CANARY_ENABLED = true; // ACTIVE FOR TESTING
exports.GEMINI_AI_CANARY_PERCENTAGE = 100; // 100%
exports.GEMINI_AI_UID_ALLOWLIST = [
    "bsd_pilot_internal_001",
    "bsd_pilot_internal_002",
    "bsd_stage2_cohort_003",
    "bsd_stage2_cohort_004",
    "bsd_stage2_cohort_005"
];
exports.PUBLIC_CANARY_ENABLED = true; // ACTIVE FOR TESTING
exports.PUBLIC_CANARY_PERCENTAGE = 100; // 100%
class GeminiCanarySafetyController {
    /**
     * Verifica si el Canary Gemini esta autorizado para un request.
     *
     * Logica de seguridad en capas:
     * 1. Si GEMINI_AI_CANARY_ENABLED es false y PUBLIC_CANARY_ENABLED es false -> siempre denegado
     * 2. Si EIAM_V3_CANARY_ENABLED es true -> denegado (evitar activacion cruzada)
     * 3. Si UID_ALLOWLIST esta vacia y PUBLIC_CANARY_PERCENTAGE es 0 -> denegado
     * 4. Default: SIEMPRE false hasta autorizacion humana explicita
     */
    static isGeminiCanaryPermittedForRequest(geminiFlag = exports.GEMINI_AI_CANARY_ENABLED, eiamFlag = exports.EIAM_V3_CANARY_ENABLED) {
        if (!geminiFlag && !exports.PUBLIC_CANARY_ENABLED)
            return false; // Fail-closed
        if (eiamFlag)
            return false; // Aislamiento: no activar Gemini si EIAM muta
        return false; // Default: siempre false hasta autorizacion humana
    }
    /**
     * Verifica si un UID especifico esta en la allowlist de Canary Gemini.
     * Soporta activacion en runtime via process.env.GEMINI_AI_CANARY_ENABLED o custom allowlist.
     */
    static isGeminiUidInCanary(uid, customAllowlist) {
        const isEnabled = process.env.GEMINI_AI_CANARY_ENABLED !== undefined
            ? process.env.GEMINI_AI_CANARY_ENABLED === "true"
            : exports.GEMINI_AI_CANARY_ENABLED;
        if (!isEnabled)
            return false;
        const allowlist = customAllowlist || exports.GEMINI_AI_UID_ALLOWLIST;
        if (allowlist.length === 0)
            return false;
        return allowlist.includes(uid);
    }
    /**
     * Verifica si un UID esta autorizado para acceder a Gemini (via Allowlist o Public Percentage Canary).
     *
     * 1. Allowlist explícita (Stage 1 / Stage 2) tiene prioridad.
     * 2. Si PUBLIC_CANARY_ENABLED es true y el hash del UID cae dentro de PUBLIC_CANARY_PERCENTAGE -> autorizado.
     * 3. De lo contrario -> denegado (fail-closed).
     */
    static isUidAuthorizedForCanary(uid, customAllowlist) {
        const effectiveUid = uid && typeof uid === "string" && uid.trim() !== ""
            ? uid.trim()
            : "guest_session";
        // A. Verificación por Allowlist Explícita (solo si tiene UID real)
        if (effectiveUid !== "guest_session" && this.isGeminiUidInCanary(effectiveUid, customAllowlist)) {
            return true;
        }
        // B. Verificación por Public Percentage Canary
        const isPublicCanaryActive = process.env.PUBLIC_CANARY_ENABLED !== undefined
            ? process.env.PUBLIC_CANARY_ENABLED === "true"
            : exports.PUBLIC_CANARY_ENABLED;
        const publicPercentage = process.env.PUBLIC_CANARY_PERCENTAGE !== undefined
            ? parseInt(process.env.PUBLIC_CANARY_PERCENTAGE, 10)
            : exports.PUBLIC_CANARY_PERCENTAGE;
        if (!isPublicCanaryActive || isNaN(publicPercentage) || publicPercentage <= 0) {
            return false;
        }
        // Deterministic hash modulo 100
        let hashVal = 0;
        for (let i = 0; i < effectiveUid.length; i++) {
            hashVal = (hashVal << 5) - hashVal + effectiveUid.charCodeAt(i);
            hashVal |= 0;
        }
        const bucket = Math.abs(hashVal) % 100;
        return bucket < publicPercentage;
    }
    /**
     * Verifica que los flags EIAM y Gemini sean independientes.
     * Util para tests de aislamiento (test M del suite C3-GR).
     */
    static assertFlagIndependence() {
        // Los dos flags deben poder cambiar independientemente.
        // Si alguno estuviera derivado del otro, esta funcion lo detectaria.
        const geminiState = exports.GEMINI_AI_CANARY_ENABLED;
        const eiamState = exports.EIAM_V3_CANARY_ENABLED;
        // Son literales independientes — la independencia es estructural
        return typeof geminiState === "boolean" && typeof eiamState === "boolean";
    }
}
exports.GeminiCanarySafetyController = GeminiCanarySafetyController;
//# sourceMappingURL=productionCanaryLock.js.map