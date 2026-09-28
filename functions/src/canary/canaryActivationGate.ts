/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY ACTIVATION GATE (FASE 2C.13 CHECKPOINT #5)
 * Separación Física y Lógica entre Preparación y Activación Real
 *
 * Microfases: C5-F (Explicit Activation Authorization Gate), C5-H (Allowlist Hard Gate), C5-P (Time-Boxed Window)
 *
 * REGLA SUPREMA: Sin una autorización explícita humana y válida, el Activation Gate está CERRADO.
 */

export interface CanaryActivationAuthorization {
  explicit: boolean;
  approvedBy: string;
  authorizationId: string;
  timestamp: number;
  configurationFingerprint: string;
  targetScope: string;
  maxPercentage: number;
  expiry: number;
}

export class CanaryActivationGate {
  // En Checkpoint #5: La autorización real está ausente (null)
  private static _currentAuthorization: CanaryActivationAuthorization | null = null;

  /**
   * Consulta el estado de la autorización de activación.
   */
  static getAuthorization(): CanaryActivationAuthorization | null {
    return this._currentAuthorization;
  }

  /**
   * Verifica rigurosamente si una autorización de activación es válida, explícita y no ha expirado.
   */
  static validateAuthorization(auth: CanaryActivationAuthorization | null, expectedFingerprint?: string): {
    isValid: boolean;
    reason: string;
  } {
    if (!auth) {
      return {
        isValid: false,
        reason: 'ACTIVATION_AUTHORIZATION_ABSENT: No existe autorización explícita para activar Canary de producción.'
      };
    }

    if (auth.explicit !== true) {
      return {
        isValid: false,
        reason: 'IMPLICIT_AUTHORIZATION_REJECTED: La autorización debe ser explícita (explicit=true).'
      };
    }

    if (!auth.approvedBy || typeof auth.approvedBy !== 'string' || auth.approvedBy.trim().length === 0) {
      return {
        isValid: false,
        reason: 'INVALID_APPROVER: approvedBy debe identificar a un operador humano autorizado.'
      };
    }

    if (Date.now() > auth.expiry) {
      return {
        isValid: false,
        reason: `AUTHORIZATION_EXPIRED: La autorización expiró en timestamp ${auth.expiry} (actual: ${Date.now()}).`
      };
    }

    if (auth.maxPercentage > 1) {
      return {
        isValid: false,
        reason: `BLAST_RADIUS_EXCEEDED: maxPercentage (${auth.maxPercentage}%) excede el límite de 1% para la ventana inicial.`
      };
    }

    if (expectedFingerprint && auth.configurationFingerprint !== expectedFingerprint) {
      return {
        isValid: false,
        reason: 'FINGERPRINT_MISMATCH: La huella de configuración de la autorización no coincide con el baseline activo.'
      };
    }

    return {
      isValid: true,
      reason: 'AUTHORIZATION_VALID: Autorización explícita validada exitosamente.'
    };
  }

  /**
   * Registra una autorización explícita para una ventana temporal autorizada.
   */
  static setAuthorization(auth: CanaryActivationAuthorization): { success: boolean; reason: string } {
    const val = this.validateAuthorization(auth);
    if (!val.isValid) {
      return { success: false, reason: val.reason };
    }
    this._currentAuthorization = auth;
    return { success: true, reason: 'Autorización registrada.' };
  }

  /**
   * Limpia y revoca cualquier autorización existente (Rollback / Cleanup).
   */
  static clearAuthorization(): void {
    this._currentAuthorization = null;
  }
}
