/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY WRITE SAFETY GATE (FASE 2C.13 CHECKPOINT #4)
 * Barrera Arquitectónica contra Mutaciones en Modo Canary
 *
 * Microfase: C4-F (Observe-Only Hard Gate) y C4-N (Firestore Write Block Test)
 */

import { CANARY_PROVISIONING_LOCK, EIAM_V3_CANARY_MODE } from '../config/productionCanaryLock';
import { CanaryKillSwitch } from './canaryKillSwitch';

export interface WriteAttemptResult {
  allowed: boolean;
  operation: string;
  reason: string;
  writeCount: 0;
}

export class CanaryWriteSafetyGate {
  /**
   * Intercepta y bloquea cualquier intento de escritura/mutación durante el Canary.
   */
  static interceptWriteAttempt(operation: string, targetCollection: string): WriteAttemptResult {
    if (CANARY_PROVISIONING_LOCK || EIAM_V3_CANARY_MODE === 'OBSERVE_ONLY') {
      const reason = `CANARY_WRITE_BLOCKED: La operación '${operation}' sobre la colección '${targetCollection}' fue bloqueada por CanaryWriteSafetyGate (Modo OBSERVE_ONLY activo).`;
      
      // Disparar Kill Switch si alguien intenta escribir deliberadamente dentro del flujo Canary
      CanaryKillSwitch.disableCanary(
        `WRITE_VIOLATION: Intento de escritura '${operation}' en '${targetCollection}' durante Canary.`,
        'CanaryWriteSafetyGate'
      );

      return {
        allowed: false,
        operation,
        reason,
        writeCount: 0
      };
    }

    return {
      allowed: false,
      operation,
      reason: 'CANARY_MUTATION_DISALLOWED: Todas las mutaciones permanecen bloqueadas en Fase 2C.13.',
      writeCount: 0
    };
  }
}
