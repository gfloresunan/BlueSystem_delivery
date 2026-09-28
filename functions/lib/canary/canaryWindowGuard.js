"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY WINDOW GUARD (FASE 2C.13 CHECKPOINT #4)
 * Control de Ventana Temporal Estricta y Auto-Aborto por Timeout
 *
 * Microfase: C4-S (Time-Boxed Canary Window)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryWindowGuard = void 0;
const canaryKillSwitch_1 = require("./canaryKillSwitch");
class CanaryWindowGuard {
    static startWindow(maxDurationMs = 10 * 60 * 1000) {
        this._startTime = Date.now();
        this._maxDurationMs = maxDurationMs;
        this._isWindowOpen = true;
    }
    static isWindowOpen() {
        if (!this._isWindowOpen || this._startTime === null) {
            return false;
        }
        const elapsed = Date.now() - this._startTime;
        if (elapsed > this._maxDurationMs) {
            // Ventana expirada -> Auto Disable
            this.closeWindow('TIMEOUT_EXPIRED');
            return false;
        }
        return true;
    }
    static closeWindow(reason = 'WINDOW_CLOSED_NORMALLY') {
        this._isWindowOpen = false;
        this._startTime = null;
        canaryKillSwitch_1.CanaryKillSwitch.disableCanary(`CANARY_WINDOW_CLOSED: ${reason}`, 'CanaryWindowGuard');
    }
    static getRemainingTimeMs() {
        if (!this._isWindowOpen || this._startTime === null) {
            return 0;
        }
        const elapsed = Date.now() - this._startTime;
        return Math.max(0, this._maxDurationMs - elapsed);
    }
    static reset() {
        this._startTime = null;
        this._isWindowOpen = false;
        this._maxDurationMs = 10 * 60 * 1000;
    }
}
exports.CanaryWindowGuard = CanaryWindowGuard;
CanaryWindowGuard._startTime = null;
CanaryWindowGuard._maxDurationMs = 10 * 60 * 1000; // 10 minutos por defecto
CanaryWindowGuard._isWindowOpen = false;
//# sourceMappingURL=canaryWindowGuard.js.map