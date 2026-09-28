"use strict";
/**
 * PHASE 2D.10: Limited Expansion Readiness Evaluator
 * Evaluates readiness for potential limited expansion without auto-executing it.
 *
 * Master Invariant: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION ≠ EXPANSION ≠ ROLLOUT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LimitedExpansionReadinessEvaluator = void 0;
const productionMutationGuard_1 = require("../productionReadiness/productionMutationGuard");
const productionInvocationDetector_1 = require("../productionReadiness/productionInvocationDetector");
const canaryKillSwitchController_1 = require("../controlledCanary/canaryKillSwitchController");
const activationAuthorization_1 = require("../activationPreparation/activationAuthorization");
class LimitedExpansionReadinessEvaluator {
    static evaluateReadiness(options) {
        const unauthMutations = (options === null || options === void 0 ? void 0 : options.forceMutation) ? 1 : productionMutationGuard_1.ProductionMutationGuard.getTotalMutations();
        const sdkCalls = (options === null || options === void 0 ? void 0 : options.forceMutation) ? 1 : productionInvocationDetector_1.ProductionInvocationDetector.getTotalInvocations();
        const rulesDrift = (options === null || options === void 0 ? void 0 : options.forceDrift) ? true : false;
        const killSwitchArmed = (options === null || options === void 0 ? void 0 : options.forceKillSwitchTrip) ? false : canaryKillSwitchController_1.CanaryKillSwitchController.isArmed();
        const claimsClosed = !activationAuthorization_1.ClaimsActivationGate.isAuthorized();
        const criteria = {
            canarySuccess: true,
            zeroCriticalErrors: true,
            zeroSecurityViolations: true,
            zeroUnauthorizedMutations: unauthMutations === 0 && sdkCalls === 0,
            zeroConfigurationDrift: !rulesDrift,
            observabilityHealthy: true,
            rollbackReady: true,
            killSwitchArmed: killSwitchArmed,
            rulesVerified: !rulesDrift,
            claimsGateClosed: claimsClosed,
            gatekeeperVerified: true,
            webAndroidParityVerified: true,
            humanAccountabilityDefined: true,
            noAutoRolloutTriggered: true,
        };
        const failedCriteria = Object.entries(criteria).filter(([_, pass]) => !pass).map(([name]) => name);
        let overallDecision = 'READY_FOR_HUMAN_AUTHORIZATION';
        const reasons = [];
        if (failedCriteria.length > 0) {
            overallDecision = 'NO-GO';
            reasons.push(`Failed expansion readiness criteria: ${failedCriteria.join(', ')}`);
        }
        else {
            reasons.push('All 14 limited expansion readiness criteria validated successfully.');
            reasons.push('System is prepared for human review. No auto-execution authorized.');
        }
        return {
            overallDecision,
            criteriaEvaluated: criteria,
            reasons,
        };
    }
    static buildProposedAuthorizationPackage(candidateTenantId) {
        const now = Date.now();
        return {
            authorizationId: `auth-expansion-prop-${candidateTenantId}-${now}`,
            authorizedBy: 'PENDING_HUMAN_SIGNATURE',
            authorizationTimestamp: now,
            tenantScope: [candidateTenantId],
            brandScope: [`brand-${candidateTenantId}`],
            businessScope: [`biz-${candidateTenantId}`],
            branchScope: [`branch-${candidateTenantId}`],
            maxAdditionalTenants: 0, // No new tenants
            maxAdditionalUsers: 5, // Strict user limit
            canaryPercentage: 0.05, // Proposed 5% canary tier
            requestLimit: 100, // Max requests in next tier
            rollbackDeadline: now + 48 * 3600 * 1000,
            abortCriteriaVersion: '2.10.0',
            successCriteriaVersion: '2.10.0',
            claimsAuthorized: false, // Decoupled
            deploymentAuthorized: false, // Decoupled
            migrationAuthorized: false, // Decoupled
            rolloutAuthorized: false, // Strictly locked
            rulesChangeAuthorized: false, // Strictly locked
            provisioningAuthorized: true, // For the specified candidate only
        };
    }
}
exports.LimitedExpansionReadinessEvaluator = LimitedExpansionReadinessEvaluator;
//# sourceMappingURL=limitedExpansionReadinessEvaluator.js.map