"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION ABORT CRITERIA EVALUATOR
 *
 * PURPOSE: 16 automatic abort conditions that immediately halt any preparation
 *          or dry-run activation. Never "continue anyway" on a critical breach.
 *
 * GOVERNANCE: Triggered condition → ABORT / ROLLBACK / ESCALATE + GovernanceViolation
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationAbortCriteria = void 0;
class ActivationAbortCriteria {
    /**
     * Evaluates incoming execution signals against all 16 abort conditions.
     */
    static evaluate(signals) {
        var _a, _b, _c, _d;
        const conditions = [];
        const now = Date.now();
        if (signals.crossTenantAnomalyDetected) {
            conditions.push('CROSS_TENANT_ANOMALY');
        }
        if (signals.claimMismatchDetected) {
            conditions.push('CLAIM_MISMATCH');
        }
        if (((_a = signals.unexpectedFirestoreMutationCount) !== null && _a !== void 0 ? _a : 0) > 0) {
            conditions.push('UNEXPECTED_FIRESTORE_MUTATION');
        }
        if (((_b = signals.unexpectedAuthMutationCount) !== null && _b !== void 0 ? _b : 0) > 0) {
            conditions.push('UNEXPECTED_AUTH_MUTATION');
        }
        if (signals.rulesDriftDetected) {
            conditions.push('RULES_DRIFT');
        }
        if (signals.configurationDriftDetected) {
            conditions.push('CONFIGURATION_DRIFT');
        }
        if (signals.entitlementMismatchDetected) {
            conditions.push('ENTITLEMENT_MISMATCH');
        }
        if (signals.subscriptionMismatchDetected) {
            conditions.push('SUBSCRIPTION_MISMATCH');
        }
        if (signals.brandMismatchDetected) {
            conditions.push('BRAND_MISMATCH');
        }
        if (signals.quotaInconsistencyDetected) {
            conditions.push('QUOTA_INCONSISTENCY');
        }
        if (signals.duplicateProvisioningDetected) {
            conditions.push('DUPLICATE_PROVISIONING');
        }
        if (signals.idempotencyConflictDetected) {
            conditions.push('IDEMPOTENCY_CONFLICT');
        }
        if (((_c = signals.unexpectedSdkInvocationCount) !== null && _c !== void 0 ? _c : 0) > 0) {
            conditions.push('UNEXPECTED_SDK_INVOCATION');
        }
        if (signals.observabilityFailureDetected) {
            conditions.push('OBSERVABILITY_FAILURE');
        }
        if (signals.rollbackFailureDetected) {
            conditions.push('ROLLBACK_FAILURE');
        }
        if (((_d = signals.securityTestFailureCount) !== null && _d !== void 0 ? _d : 0) > 0) {
            conditions.push('SECURITY_TEST_FAILURE');
        }
        if (conditions.length === 0) {
            return {
                triggered: false,
                conditions: [],
                decision: 'NO_ABORT',
            };
        }
        // Determine decision severity
        const criticalConditions = [
            'CROSS_TENANT_ANOMALY',
            'UNEXPECTED_FIRESTORE_MUTATION',
            'UNEXPECTED_AUTH_MUTATION',
            'UNEXPECTED_SDK_INVOCATION',
            'ROLLBACK_FAILURE',
            'SECURITY_TEST_FAILURE',
            'RULES_DRIFT',
        ];
        const hasCritical = conditions.some(c => criticalConditions.includes(c));
        const decision = hasCritical ? 'ABORT' : (conditions.includes('IDEMPOTENCY_CONFLICT') ? 'ROLLBACK' : 'ESCALATE');
        const violation = {
            violationType: conditions[0],
            severity: hasCritical ? 'CRITICAL' : 'HIGH',
            detectedAt: now,
            details: `Abort triggered by ${conditions.length} condition(s): ${conditions.join(', ')}`,
            blockedOperation: 'CONTROLLED_ACTIVATION_PROCESS',
        };
        return {
            triggered: true,
            conditions,
            decision,
            governanceViolation: violation,
        };
    }
}
exports.ActivationAbortCriteria = ActivationAbortCriteria;
//# sourceMappingURL=activationAbortCriteria.js.map