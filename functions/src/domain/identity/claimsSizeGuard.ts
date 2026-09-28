/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Claims Size Guard
 * 
 * Verificador estricto de tamaño en bytes para Custom Claims de Firebase Auth.
 * Límite duro: 1000 bytes. Umbral de advertencia: 800 bytes.
 */

export interface ClaimsSizeEvaluation {
  isValid: boolean;
  byteSize: number;
  status: 'PASS' | 'PASS_WITH_WARNING' | 'FAIL_OVERSIZED';
  message: string;
}

export class ClaimsSizeGuard {
  static readonly MAX_CLAIMS_BYTES = 1000;
  static readonly WARNING_THRESHOLD = 800;

  /**
   * Mide el tamaño exacto en bytes UTF-8 del objeto serializado de Claims
   */
  static measureBytes(claims: object): number {
    const jsonStr = JSON.stringify(claims);
    return Buffer.byteLength(jsonStr, 'utf8');
  }

  /**
   * Evalúa si un payload de claims cumple con el presupuesto estricto
   */
  static evaluate(claims: object): ClaimsSizeEvaluation {
    const byteSize = this.measureBytes(claims);

    if (byteSize >= this.MAX_CLAIMS_BYTES) {
      return {
        isValid: false,
        byteSize,
        status: 'FAIL_OVERSIZED',
        message: `Violación de Límite Firebase: El payload de claims (${byteSize} bytes) excede el máximo permitido de ${this.MAX_CLAIMS_BYTES} bytes.`
      };
    }

    if (byteSize >= this.WARNING_THRESHOLD) {
      return {
        isValid: true,
        byteSize,
        status: 'PASS_WITH_WARNING',
        message: `Advertencia de Presupuesto: El payload de claims (${byteSize} bytes) supera el umbral de advertencia de ${this.WARNING_THRESHOLD} bytes.`
      };
    }

    return {
      isValid: true,
      byteSize,
      status: 'PASS',
      message: `Payload de claims dentro del presupuesto óptimo (${byteSize} bytes).`
    };
  }
}
