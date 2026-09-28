"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION OBSERVABILITY LOGGER
 *
 * PURPOSE: 13 canonical observability events for activation lifecycle tracking.
 *          Strict secret scrubbing prevents credential or PII leakage.
 *
 * GOVERNANCE: Pure in-memory event emitter. Zero production logging integrations.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationObservabilityLogger = void 0;
const FORBIDDEN_SECRET_PATTERNS = [
    /password/i,
    /bearer\s+[a-z0-9\-_\.]+/i,
    /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+/i, // JWT pattern
    /private[_-]?key/i,
    /api[_-]?key/i,
    /secret/i,
    /service_account/i,
];
class ActivationObservabilityLogger {
    /**
     * Logs a structured activation observability event after scrubbing for secrets.
     */
    static log(type, reason, details) {
        this.assertNoSecrets(reason);
        if (details) {
            for (const val of Object.values(details)) {
                if (typeof val === 'string') {
                    this.assertNoSecrets(val);
                }
            }
        }
        const event = {
            eventId: `act-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type,
            tenantId: details === null || details === void 0 ? void 0 : details.tenantId,
            brandId: details === null || details === void 0 ? void 0 : details.brandId,
            candidateId: details === null || details === void 0 ? void 0 : details.candidateId,
            module: details === null || details === void 0 ? void 0 : details.module,
            role: details === null || details === void 0 ? void 0 : details.role,
            decision: details === null || details === void 0 ? void 0 : details.decision,
            reason,
            timestamp: Date.now(),
        };
        this.eventStore.push(event);
        return event;
    }
    /**
     * Asserts that a text string does not match any forbidden credential/secret pattern.
     */
    static assertNoSecrets(content) {
        for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
            if (pattern.test(content)) {
                throw new Error(`OBSERVABILITY_SECURITY_VIOLATION: Event content contains forbidden secret pattern "${pattern.source}"`);
            }
        }
    }
    static getEvents() {
        return [...this.eventStore];
    }
    static getEventsByType(type) {
        return this.eventStore.filter(e => e.type === type);
    }
    static clear() {
        this.eventStore.length = 0;
    }
}
exports.ActivationObservabilityLogger = ActivationObservabilityLogger;
ActivationObservabilityLogger.eventStore = [];
//# sourceMappingURL=activationObservability.js.map