"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY WRITE SAFETY GATE (FASE 2C.13 CHECKPOINT #4)
 * Barrera Arquitectónica contra Mutaciones en Modo Canary
 *
 * Microfase: C4-F (Observe-Only Hard Gate) y C4-N (Firestore Write Block Test)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryWriteSafetyGate = void 0;
const productionCanaryLock_1 = require("../config/productionCanaryLock");
const canaryKillSwitch_1 = require("./canaryKillSwitch");
class CanaryWriteSafetyGate {
    /**
     * Intercepta y bloquea cualquier intento de escritura/mutación durante el Canary.
     */
    static interceptWriteAttempt(operation, targetCollection) {
        if (productionCanaryLock_1.CANARY_PROVISIONING_LOCK || productionCanaryLock_1.EIAM_V3_CANARY_MODE === 'OBSERVE_ONLY') {
            const reason = `CANARY_WRITE_BLOCKED: La operación '${operation}' sobre la colección '${targetCollection}' fue bloqueada por CanaryWriteSafetyGate (Modo OBSERVE_ONLY activo).`;
            // Disparar Kill Switch si alguien intenta escribir deliberadamente dentro del flujo Canary
            canaryKillSwitch_1.CanaryKillSwitch.disableCanary(`WRITE_VIOLATION: Intento de escritura '${operation}' en '${targetCollection}' durante Canary.`, 'CanaryWriteSafetyGate');
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
exports.CanaryWriteSafetyGate = CanaryWriteSafetyGate;
//# sourceMappingURL=canaryWriteSafetyGate.js.map