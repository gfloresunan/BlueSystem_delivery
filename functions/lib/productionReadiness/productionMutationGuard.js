"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.7 PRODUCTION READINESS CERTIFICATION
 * Production Mutation Guard
 *
 * PURPOSE: Independent counters verifying that ZERO production mutations occur
 *          during C2D.7. Each counter must remain at 0.
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionMutationGuard = void 0;
class ProductionMutationGuard {
    /** Registers an attempted production mutation. Always blocked during C2D.7. */
    static recordAttempt(category, description) {
        this._counters[category]++;
        this._log.push({
            category,
            description,
            timestamp: Date.now(),
            blocked: true,
        });
        throw new Error(`🚨 PRODUCTION_MUTATION_BLOCKED [${category}]: "${description}". ` +
            `Current counter: ${this._counters[category]}. STATUS: NO-GO.`);
    }
    /** Returns the current count for a specific mutation category. */
    static getCount(category) {
        return this._counters[category];
    }
    /** Returns all counters. */
    static getAllCounters() {
        return Object.assign({}, this._counters);
    }
    /** Returns total mutations across all categories. */
    static getTotalMutations() {
        return Object.values(this._counters).reduce((a, b) => a + b, 0);
    }
    /** Returns whether any mutation occurred. */
    static hasViolations() {
        return this.getTotalMutations() > 0;
    }
    /**
     * Asserts all counters are exactly 0.
     * Throws if any mutation category has a non-zero count.
     */
    static assertZeroMutations() {
        const violations = Object.entries(this._counters)
            .filter(([, count]) => count > 0)
            .map(([cat, count]) => `  - ${cat}: ${count} mutation(s)`);
        if (violations.length > 0) {
            throw new Error(`PRODUCTION_MUTATION_AUDIT_FAILURE: Non-zero mutation counters detected:\n` +
                violations.join('\n') +
                `\nSTATUS: NO-GO`);
        }
    }
    /** Builds the zero-mutation audit report. */
    static buildAuditReport() {
        const total = this.getTotalMutations();
        return {
            counters: this.getAllCounters(),
            totalMutations: total,
            hasViolations: total > 0,
            status: total === 0 ? 'PASS' : 'NO-GO',
            log: [...this._log],
        };
    }
    /** Resets all counters and log. */
    static reset() {
        Object.keys(this._counters).forEach(k => {
            this._counters[k] = 0;
        });
        this._log = [];
    }
}
exports.ProductionMutationGuard = ProductionMutationGuard;
ProductionMutationGuard._counters = {
    FIRESTORE_WRITE: 0,
    FIRESTORE_UPDATE: 0,
    FIRESTORE_DELETE: 0,
    AUTH_MUTATION: 0,
    CLAIMS_MUTATION: 0,
    TOKEN_REVOCATION: 0,
    PROVISIONING_OPERATION: 0,
    ROOM_MIGRATION: 0,
    RULES_DEPLOYMENT: 0,
    HOSTING_DEPLOYMENT: 0,
    FUNCTIONS_DEPLOYMENT: 0,
};
ProductionMutationGuard._log = [];
//# sourceMappingURL=productionMutationGuard.js.map