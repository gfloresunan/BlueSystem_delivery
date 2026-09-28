"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION WINDOW CONTRACT & VALIDATOR
 *
 * PURPOSE: Time-bounded contract ensuring future activations have strict start,
 *          end, freeze, support, rollback deadline, and observation boundaries.
 *
 * GOVERNANCE: Dry-run validation only. Does not execute or open any live window.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationWindowValidator = void 0;
class ActivationWindowValidator {
    /**
     * Validates structural invariants of an ActivationWindow.
     */
    static validate(window) {
        const errors = [];
        if (!window.windowId || window.windowId.trim().length === 0) {
            errors.push('WINDOW_ID_REQUIRED');
        }
        if (window.start >= window.end) {
            errors.push('INVALID_TIME_RANGE: start must be strictly before end');
        }
        if (window.rollbackDeadline > window.end) {
            errors.push('INVALID_ROLLBACK_DEADLINE: rollbackDeadline must be <= end');
        }
        if (window.rollbackDeadline < window.start) {
            errors.push('INVALID_ROLLBACK_DEADLINE: rollbackDeadline must be >= start');
        }
        if (!window.timezone || window.timezone.trim().length === 0) {
            errors.push('TIMEZONE_REQUIRED');
        }
        if (!window.changeFreeze) {
            errors.push('CHANGE_FREEZE_REQUIRED: changeFreeze must be true during activation window');
        }
        if (!window.observationWindow || window.observationWindow.durationMs <= 0) {
            errors.push('OBSERVATION_WINDOW_REQUIRED: durationMs must be > 0');
        }
        if (window.observationWindow && window.observationWindow.healthCheckIntervalMs <= 0) {
            errors.push('HEALTH_CHECK_INTERVAL_REQUIRED: healthCheckIntervalMs must be > 0');
        }
        return {
            isValid: errors.length === 0,
            errors,
            window: errors.length === 0 ? window : undefined,
        };
    }
    /**
     * Checks whether a given timestamp falls within the window boundaries.
     */
    static isWithinWindow(window, timestamp) {
        return timestamp >= window.start && timestamp <= window.end;
    }
    /**
     * Builds a canonical simulation-only ActivationWindow fixture.
     */
    static createSimulationWindow(offsetStartMs = 3600000, durationMs = 7200000) {
        const now = Date.now();
        const start = now + offsetStartMs;
        const end = start + durationMs;
        const rollbackDeadline = start + durationMs * 0.75; // 75% through window
        return {
            windowId: `win-sim-${now}`,
            start,
            end,
            timezone: 'America/Mexico_City',
            changeFreeze: true,
            supportWindow: {
                startOffset: 1800000, // 30m prior
                endOffset: 3600000, // 1h post
            },
            rollbackDeadline,
            observationWindow: {
                durationMs: 3600000, // 1h observation
                healthCheckIntervalMs: 60000, // 1m checks
            },
        };
    }
}
exports.ActivationWindowValidator = ActivationWindowValidator;
//# sourceMappingURL=activationWindow.js.map