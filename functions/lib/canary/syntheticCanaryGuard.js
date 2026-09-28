"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — SYNTHETIC CANARY IDENTITY GUARD (FASE 2C.13 CHECKPOINT #4)
 * Barrera Estricta de Identidad Sintética y Exclusión Total de Usuarios Reales
 *
 * Microfases: C4-B (Real-User Exclusion), C4-C (Synthetic Allowlist), C4-D (Canary Enablement Safety)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticCanaryIdentityGuard = void 0;
const canaryKillSwitch_1 = require("./canaryKillSwitch");
class SyntheticCanaryIdentityGuard {
    /**
     * Valida rigurosamente si un sujeto califica como 100% sintético para el Canary.
     * Regla de Oro: Si falla CUALQUIERA de las condiciones, es tratado como usuario real y rechazado.
     */
    static isSyntheticSubject(subject) {
        if (!subject) {
            return false;
        }
        if (subject.isSynthetic !== true) {
            return false;
        }
        if (subject.isProductionUser !== false) {
            return false;
        }
        if (subject.environment !== 'CANARY_SYNTHETIC') {
            return false;
        }
        if (!subject.uid || !this.SYNTHETIC_UID_PATTERN.test(subject.uid)) {
            return false;
        }
        return true;
    }
    /**
     * Verifica si un UID string plano tiene el formato sintético estricto.
     */
    static isSyntheticUidString(uid) {
        if (!uid || typeof uid !== 'string') {
            return false;
        }
        return this.SYNTHETIC_UID_PATTERN.test(uid);
    }
    /**
     * Valida un sujeto antes de entrar al Canary; si no es sintético, dispara aborto inmediato.
     */
    static validateSubjectOrAbort(subject, context = 'ROUTER') {
        const isSynthetic = this.isSyntheticSubject(subject);
        if (!isSynthetic) {
            canaryKillSwitch_1.CanaryKillSwitch.disableCanary(`SYNTHETIC_IDENTITY_REJECTED: Intento de procesar sujeto no sintético o usuario real en contexto ${context}`, 'SyntheticCanaryIdentityGuard');
            return false;
        }
        return true;
    }
}
exports.SyntheticCanaryIdentityGuard = SyntheticCanaryIdentityGuard;
SyntheticCanaryIdentityGuard.SYNTHETIC_UID_PATTERN = /^CANARY_SYNTHETIC_ONLY_[A-Za-z0-9_]+$/;
//# sourceMappingURL=syntheticCanaryGuard.js.map