"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY OBSERVABILITY & SECRET SCRUBBING LOGGER
 *
 * PURPOSE: 16 canonical event types for tracking controlled canary execution.
 *          Automatic secret scrubbing prevents any credentials, tokens, or JWTs
 *          from entering audit streams.
 *
 * GOVERNANCE: Pure in-memory logging. Zero unauthorized telemetry leaks.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryObservabilityLogger = void 0;
const FORBIDDEN_SECRET_PATTERNS = [
    /password/i,
    /bearer\s+[a-z0-9\-_\.]+/i,
    /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+/i, // JWT pattern
    /private[_-]?key/i,
    /api[_-]?key/i,
    /secret/i,
    /credential/i,
];
class CanaryObservabilityLogger {
    /**
     * Logs an observability event with automated secret scrubbing.
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
            eventId: `canary-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type,
            tenantId: details === null || details === void 0 ? void 0 : details.tenantId,
            brandId: details === null || details === void 0 ? void 0 : details.brandId,
            candidateId: details === null || details === void 0 ? void 0 : details.candidateId,
            requestId: details === null || details === void 0 ? void 0 : details.requestId,
            module: details === null || details === void 0 ? void 0 : details.module,
            role: details === null || details === void 0 ? void 0 : details.role,
            decision: details === null || details === void 0 ? void 0 : details.decision,
            reason,
            timestamp: Date.now(),
        };
        this.events.push(event);
        return event;
    }
    /**
     * Logs canary traffic context tagging.
     */
    static logTraffic(ctx) {
        this.assertNoSecrets(ctx.scope);
        this.trafficLogs.push(ctx);
    }
    /**
     * Asserts that a text content contains zero secrets.
     */
    static assertNoSecrets(content) {
        for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
            if (pattern.test(content)) {
                throw new Error(`OBSERVABILITY_SECURITY_VIOLATION: Event content contains forbidden secret pattern "${pattern.source}"`);
            }
        }
    }
    static getEvents() {
        return [...this.events];
    }
    static getTrafficLogs() {
        return [...this.trafficLogs];
    }
    static clear() {
        this.events.length = 0;
        this.trafficLogs.length = 0;
    }
}
exports.CanaryObservabilityLogger = CanaryObservabilityLogger;
CanaryObservabilityLogger.events = [];
CanaryObservabilityLogger.trafficLogs = [];
//# sourceMappingURL=canaryObservabilityLogger.js.map