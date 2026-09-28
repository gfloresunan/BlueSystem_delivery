"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY KILL SWITCH CONTROLLER
 *
 * PURPOSE: Manages KILL_SWITCH = ARMED state.
 *          Evaluates 17 automatic abort triggers and instantly trips to freeze
 *          operations and halt canary traffic.
 *
 * GOVERNANCE: Automatic abort on any critical anomaly. Zero unhandled alerts.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryKillSwitchController = void 0;
const canaryObservabilityLogger_1 = require("./canaryObservabilityLogger");
const canaryKillSwitch_1 = require("../canary/canaryKillSwitch");
class CanaryKillSwitchController {
    static isArmed() {
        return !canaryKillSwitch_1.CanaryKillSwitch.isCanaryActive() && !this.isTrippedState;
    }
    static isTripped() {
        return this.isTrippedState;
    }
    static trip(reason, details) {
        this.isTrippedState = true;
        canaryObservabilityLogger_1.CanaryObservabilityLogger.log('ACTIVATION_ABORTED', `KILL_SWITCH_TRIPPED: ${reason}`, details);
    }
    static reset() {
        this.isTrippedState = false;
        canaryKillSwitch_1.CanaryKillSwitch.reset();
    }
    /**
     * Evaluates all 17 abort triggers.
     */
    static evaluateSignals(signals) {
        const conditions = [];
        if (signals.tenantMismatch)
            conditions.push('TENANT_MISMATCH');
        if (signals.brandMismatch)
            conditions.push('BRAND_MISMATCH');
        if (signals.subscriptionMismatch)
            conditions.push('SUBSCRIPTION_MISMATCH');
        if (signals.entitlementMismatch)
            conditions.push('ENTITLEMENT_MISMATCH');
        if (signals.roleEscalation)
            conditions.push('ROLE_ESCALATION');
        if (signals.quotaInconsistency)
            conditions.push('QUOTA_INCONSISTENCY');
        if (signals.unexpectedFirestoreMutation)
            conditions.push('UNEXPECTED_FIRESTORE_MUTATION');
        if (signals.unexpectedAuthMutation)
            conditions.push('UNEXPECTED_AUTH_MUTATION');
        if (signals.unauthorizedClaims)
            conditions.push('UNAUTHORIZED_CLAIMS');
        if (signals.rulesDrift)
            conditions.push('RULES_DRIFT');
        if (signals.configurationDrift)
            conditions.push('CONFIGURATION_DRIFT');
        if (signals.duplicateProvisioning)
            conditions.push('DUPLICATE_PROVISIONING');
        if (signals.idempotencyConflict)
            conditions.push('IDEMPOTENCY_CONFLICT');
        if (signals.unexpectedProductionSdk)
            conditions.push('UNEXPECTED_PRODUCTION_SDK');
        if (signals.observabilityFailure)
            conditions.push('OBSERVABILITY_FAILURE');
        if (signals.rollbackFailure)
            conditions.push('ROLLBACK_FAILURE');
        if (signals.killSwitchFailure)
            conditions.push('KILL_SWITCH_FAILURE');
        if (conditions.length === 0) {
            return {
                triggered: false,
                conditions: [],
                decision: 'NO_ABORT',
                timestamp: Date.now(),
            };
        }
        // Critical abort conditions
        const criticalAbortConditions = [
            'RULES_DRIFT',
            'CONFIGURATION_DRIFT',
            'UNEXPECTED_PRODUCTION_SDK',
            'ROLLBACK_FAILURE',
            'KILL_SWITCH_FAILURE',
            'UNEXPECTED_FIRESTORE_MUTATION',
            'UNEXPECTED_AUTH_MUTATION',
        ];
        const isCritical = conditions.some(c => criticalAbortConditions.includes(c));
        this.trip(`Automatic abort triggered by [${conditions.join(', ')}]`);
        return {
            triggered: true,
            conditions,
            decision: isCritical ? 'ABORT' : 'ROLLBACK',
            details: `17-trigger evaluator caught ${conditions.length} violation(s)`,
            timestamp: Date.now(),
        };
    }
}
exports.CanaryKillSwitchController = CanaryKillSwitchController;
CanaryKillSwitchController.isTrippedState = false;
//# sourceMappingURL=canaryKillSwitchController.js.map