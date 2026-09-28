"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION SCOPE ENFORCER
 *
 * PURPOSE: Validates that no out-of-scope operation is attempted during the
 *          controlled activation preparation. Enforces MINIMUM VIABLE ACTIVATION
 *          SCOPE and prevents accidental scope expansion.
 *
 * GOVERNANCE: Any out-of-scope operation → BLOCKED + GOVERNANCE_VIOLATION
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationScopeValidator = exports.MINIMUM_VIABLE_ACTIVATION_SCOPE = void 0;
exports.isOperationInScope = isOperationInScope;
exports.isOperationExcluded = isOperationExcluded;
exports.validateScopeOperation = validateScopeOperation;
// ─── MINIMUM VIABLE ACTIVATION SCOPE ─────────────────────────────────────────
exports.MINIMUM_VIABLE_ACTIVATION_SCOPE = {
    included: [
        'CORE_BACKEND',
        'TENANT',
        'BRAND',
        'BUSINESS',
        'BRANCH',
        'SUBSCRIPTION',
        'ENTITLEMENTS',
        'MEMBERSHIP',
        'GATEKEEPER',
        'WEB_EXPERIENCE',
        'ANDROID_EXPERIENCE',
        'INITIAL_CONFIGURATION',
    ],
    explicitlyExcluded: [
        'ADDITIONAL_TENANTS',
        'ADDITIONAL_BRANDS',
        'ADDITIONAL_USERS',
        'BULK_PROVISIONING',
        'MIGRATION',
        'MASS_CLAIMS_ROLLOUT',
        'GENERAL_CANARY',
        'MARKETPLACE_WIDE_ACTIVATION',
    ],
    minimumViableScope: true,
};
class ActivationScopeValidator {
    constructor(scope = exports.MINIMUM_VIABLE_ACTIVATION_SCOPE) {
        this.scope = scope;
    }
    isIncluded(operation) {
        return this.scope.included.includes(operation);
    }
    isExplicitlyExcluded(operation) {
        return this.scope.explicitlyExcluded.includes(operation);
    }
    validate(operation) {
        if (this.isExplicitlyExcluded(operation)) {
            const violation = {
                violationType: 'UNEXPECTED_SDK_INVOCATION',
                severity: 'CRITICAL',
                detectedAt: Date.now(),
                details: `Operation "${operation}" is EXPLICITLY EXCLUDED from the first activation scope`,
                blockedOperation: operation,
            };
            return {
                allowed: false,
                reason: `SCOPE_VIOLATION: "${operation}" is explicitly excluded from MINIMUM_VIABLE_ACTIVATION_SCOPE`,
                violation,
            };
        }
        if (!this.isIncluded(operation)) {
            return {
                allowed: false,
                reason: `SCOPE_UNRECOGNIZED: "${operation}" is not in the defined activation scope`,
            };
        }
        return {
            allowed: true,
            reason: `"${operation}" is within MINIMUM_VIABLE_ACTIVATION_SCOPE`,
        };
    }
    /**
     * Validates that the scope is truly minimum viable — no scope creep.
     * Returns false if scope contains items beyond MINIMUM_VIABLE_ACTIVATION_SCOPE.
     */
    validateNoScopeCreep() {
        const allowedItems = new Set(exports.MINIMUM_VIABLE_ACTIVATION_SCOPE.included);
        return this.scope.included.every(item => allowedItems.has(item));
    }
    /**
     * Returns a summary of what is and is NOT in scope.
     */
    getScopeSummary() {
        return {
            included: [...this.scope.included],
            excluded: [...this.scope.explicitlyExcluded],
            minimumViable: this.scope.minimumViableScope,
        };
    }
}
exports.ActivationScopeValidator = ActivationScopeValidator;
// ─── Static Scope Guards (no instance needed) ─────────────────────────────────
const _defaultValidator = new ActivationScopeValidator();
function isOperationInScope(operation) {
    return _defaultValidator.isIncluded(operation);
}
function isOperationExcluded(operation) {
    return _defaultValidator.isExplicitlyExcluded(operation);
}
function validateScopeOperation(operation) {
    return _defaultValidator.validate(operation);
}
//# sourceMappingURL=activationScope.js.map