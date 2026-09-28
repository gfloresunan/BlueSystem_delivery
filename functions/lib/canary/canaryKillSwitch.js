"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY KILL SWITCH (FASE 2C.13)
 * Disparador Determinístico de Aborto y Retorno a 100% Legacy
 *
 * Microfases: 2C.13-S (Kill Switch) y 2C.13-T (Automatic Abort Conditions)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryKillSwitch = void 0;
class CanaryKillSwitch {
    /**
     * Consulta el estado del Kill Switch.
     * Si retorna FALSE, el sistema opera 100% en Legacy.
     */
    static isCanaryActive() {
        return this._isActive;
    }
    /**
     * Desactiva inmediatamente el Canary EIAM v3 retornando al Carril A Legacy.
     */
    static disableCanary(reason, triggeredBy = 'AUTOMATIC_MONITOR') {
        this._isActive = false;
        const activation = {
            timestamp: Date.now(),
            reason,
            triggeredBy,
            automatic: triggeredBy === 'AUTOMATIC_MONITOR'
        };
        this._activationLog.push(activation);
        console.warn(`🛑 CANARY KILL SWITCH TRIGGERED: ${reason} (by ${triggeredBy})`);
    }
    /**
     * Activación controlada (solo para ventanas autorizadas o simulaciones de prueba).
     */
    static enableCanaryForWindow(authorizedBy) {
        this._isActive = true;
        this._activationLog.push({
            timestamp: Date.now(),
            reason: 'CANARY_WINDOW_OPENED',
            triggeredBy: authorizedBy,
            automatic: false
        });
        return true;
    }
    /**
     * Evalúa condiciones automáticas de aborto y dispara el Kill Switch si se detecta cualquier anomalía.
     */
    static evaluateAbortConditions(metrics) {
        if (metrics.unexpectedMismatches > 0) {
            this.disableCanary(`ABORT: Se detectaron ${metrics.unexpectedMismatches} mismatches inesperados.`);
            return true;
        }
        if (metrics.crossTenantUnexpectedAllows > 0) {
            this.disableCanary(`ABORT: Violación de seguridad Cross-Tenant detectada (${metrics.crossTenantUnexpectedAllows} allows).`);
            return true;
        }
        if (metrics.authMutations > 0 || metrics.claimsMutations > 0) {
            this.disableCanary('ABORT: Intento no autorizado de mutación en Auth o Custom Claims.');
            return true;
        }
        if (metrics.productionFirestoreWrites > 0) {
            this.disableCanary('ABORT: Intento de escritura en Firestore de producción durante Canary.');
            return true;
        }
        if (metrics.rulesDeployments > 0) {
            this.disableCanary('ABORT: Intento de despliegue de Firestore Rules.');
            return true;
        }
        return false;
    }
    static getActivationHistory() {
        return [...this._activationLog];
    }
    static reset() {
        this._isActive = false;
        this._activationLog = [];
    }
}
exports.CanaryKillSwitch = CanaryKillSwitch;
CanaryKillSwitch._isActive = false;
CanaryKillSwitch._activationLog = [];
//# sourceMappingURL=canaryKillSwitch.js.map