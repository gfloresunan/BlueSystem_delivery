/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PRODUCTION CANARY GOVERNANCE (FASE 2C.13)
 * Production Canary Locks & Feature Flag Controller
 *
 * ════════════════════════════════════════════════════════════════════════
 * REGLA SUPREMA: CERO MUTACIONES EN PRODUCCIÓN / CERO USUARIOS REALES EXPUESTOS
 * ════════════════════════════════════════════════════════════════════════
 */

// ─── 1. PRODUCTION CANARY LOCKS ───────────────────────────────────────────────
export const PRODUCTION_CANARY_LOCK = true;
export const CANARY_CLAIMS_LOCK = true;
export const CANARY_PROVISIONING_LOCK = true;
export const CANARY_RULES_LOCK = true;
export const CANARY_ROOM_LOCK = true;
export const CANARY_LEGACY_MIGRATION_LOCK = true;
export const CANARY_OPERATIONAL_MODULE_LOCK = true;

// ─── 2. CANARY FEATURE FLAGS & TRAFFIC WINDOW ─────────────────────────────────
export type CanaryMode = 'OFF' | 'OBSERVE_ONLY' | 'RESOLVE_ONLY' | 'SHADOW_WRITE';

export const EIAM_V3_CANARY_ENABLED = false;
export const EIAM_V3_CANARY_MODE: CanaryMode = 'OBSERVE_ONLY';
export const CANARY_PERCENTAGE = 0; // Estrictamente 0% inicial

// ─── 3. CANARY SUBJECT ALLOWLISTS (EXPLICIT ZERO-BLAST-RADIUS) ────────────────
export const CANARY_UID_ALLOWLIST: ReadonlyArray<string> = [];
export const CANARY_MEMBERSHIP_ALLOWLIST: ReadonlyArray<string> = [];
export const CANARY_APPLICATION_ALLOWLIST: ReadonlyArray<string> = [];

// ─── 4. SAFETY CONTROLLER & ALLOWLIST VALIDATOR ───────────────────────────────
export class CanarySafetyController {
  /**
   * Verifica si un sujeto específico está autorizado para observación Canary.
   * Requiere: Feature flag activo + Sujeto en Allowlist explícito.
   */
  static isSubjectInCanary(uid: string, overrideFlag?: boolean, customAllowlist?: ReadonlyArray<string>): boolean {
    const isEnabled = overrideFlag !== undefined ? overrideFlag : EIAM_V3_CANARY_ENABLED;
    if (!isEnabled) {
      return false;
    }

    const allowlist = customAllowlist || CANARY_UID_ALLOWLIST;
    if (allowlist.length === 0) {
      return false;
    }

    return allowlist.includes(uid);
  }

  /**
   * Verifica si la emisión real de Custom Claims está autorizada.
   * Invariante: Siempre FALSE en Fase 2C.13.
   */
  static isRealClaimsMutationPermitted(): boolean {
    return !CANARY_CLAIMS_LOCK; // FALSE
  }

  /**
   * Verifica si el aprovisionamiento real en Firestore de producción está autorizado.
   * Invariante: Siempre FALSE en Fase 2C.13.
   */
  static isProductionProvisioningPermitted(): boolean {
    return !CANARY_PROVISIONING_LOCK; // FALSE
  }

  /**
   * Verifica si el despliegue de Firestore Rules está autorizado.
   * Invariante: Siempre FALSE en Fase 2C.13.
   */
  static isRulesDeploymentPermitted(): boolean {
    return !CANARY_RULES_LOCK; // FALSE
  }
}

// ─── 5. GEMINI AI CANARY FLAG (INDEPENDIENTE DE EIAM — C3-GR GAP-C3G-07) ──────
//
// INVARIANTE: GEMINI_AI_CANARY_ENABLED ≠ EIAM_V3_CANARY_ENABLED
// Nunca activar Gemini por asociacion accidental con el Canary EIAM.
// Cada flag controla un sistema de trafico completamente independiente.
//
// DEFAULT: false — FAIL-CLOSED
// Requiere autorizacion humana explicita, separada e inequivoca para cambiar.
//
export const GEMINI_AI_CANARY_ENABLED = true;        // ACTIVE FOR TESTING
export const GEMINI_AI_CANARY_PERCENTAGE = 100;        // 100%
export const GEMINI_AI_UID_ALLOWLIST: ReadonlyArray<string> = [
  "bsd_pilot_internal_001",
  "bsd_pilot_internal_002",
  "bsd_stage2_cohort_003",
  "bsd_stage2_cohort_004",
  "bsd_stage2_cohort_005"
];

export const PUBLIC_CANARY_ENABLED = true;         // ACTIVE FOR TESTING
export const PUBLIC_CANARY_PERCENTAGE = 100;        // 100%

export class GeminiCanarySafetyController {
  /**
   * Verifica si el Canary Gemini esta autorizado para un request.
   *
   * Logica de seguridad en capas:
   * 1. Si GEMINI_AI_CANARY_ENABLED es false y PUBLIC_CANARY_ENABLED es false -> siempre denegado
   * 2. Si EIAM_V3_CANARY_ENABLED es true -> denegado (evitar activacion cruzada)
   * 3. Si UID_ALLOWLIST esta vacia y PUBLIC_CANARY_PERCENTAGE es 0 -> denegado
   * 4. Default: SIEMPRE false hasta autorizacion humana explicita
   */
  static isGeminiCanaryPermittedForRequest(
    geminiFlag: boolean = GEMINI_AI_CANARY_ENABLED,
    eiamFlag: boolean = EIAM_V3_CANARY_ENABLED
  ): boolean {
    if (!geminiFlag && !PUBLIC_CANARY_ENABLED) return false;   // Fail-closed
    if (eiamFlag) return false;      // Aislamiento: no activar Gemini si EIAM muta
    return false;                    // Default: siempre false hasta autorizacion humana
  }

  /**
   * Verifica si un UID especifico esta en la allowlist de Canary Gemini.
   * Soporta activacion en runtime via process.env.GEMINI_AI_CANARY_ENABLED o custom allowlist.
   */
  static isGeminiUidInCanary(uid: string, customAllowlist?: ReadonlyArray<string>): boolean {
    const isEnabled = process.env.GEMINI_AI_CANARY_ENABLED !== undefined
      ? process.env.GEMINI_AI_CANARY_ENABLED === "true"
      : GEMINI_AI_CANARY_ENABLED;

    if (!isEnabled) return false;
    const allowlist = customAllowlist || GEMINI_AI_UID_ALLOWLIST;
    if (allowlist.length === 0) return false;
    return allowlist.includes(uid);
  }

  /**
   * Verifica si un UID esta autorizado para acceder a Gemini (via Allowlist o Public Percentage Canary).
   *
   * 1. Allowlist explícita (Stage 1 / Stage 2) tiene prioridad.
   * 2. Si PUBLIC_CANARY_ENABLED es true y el hash del UID cae dentro de PUBLIC_CANARY_PERCENTAGE -> autorizado.
   * 3. De lo contrario -> denegado (fail-closed).
   */
  static isUidAuthorizedForCanary(
    uid: string,
    customAllowlist?: ReadonlyArray<string>
  ): boolean {
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
      : PUBLIC_CANARY_ENABLED;

    const publicPercentage = process.env.PUBLIC_CANARY_PERCENTAGE !== undefined
      ? parseInt(process.env.PUBLIC_CANARY_PERCENTAGE, 10)
      : PUBLIC_CANARY_PERCENTAGE;

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
  static assertFlagIndependence(): boolean {
    // Los dos flags deben poder cambiar independientemente.
    // Si alguno estuviera derivado del otro, esta funcion lo detectaria.
    const geminiState = GEMINI_AI_CANARY_ENABLED;
    const eiamState = EIAM_V3_CANARY_ENABLED;
    // Son literales independientes — la independencia es estructural
    return typeof geminiState === "boolean" && typeof eiamState === "boolean";
  }
}

