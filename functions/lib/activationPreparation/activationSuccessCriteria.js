"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION SUCCESS CRITERIA VALIDATOR
 *
 * PURPOSE: 16 objective metrics determining whether a controlled activation
 *          preparation dry-run qualifies as DRY_RUN_SUCCESS.
 *
 * GOVERNANCE: DRY_RUN_SUCCESS ≠ PRODUCTION_SUCCESS
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationSuccessCriteria = void 0;
class ActivationSuccessCriteria {
    /**
     * Evaluates all 16 objective success metrics.
     */
    static validate(ctx) {
        const now = Date.now();
        const criteria = [];
        criteria.push({
            id: 'TENANT_IDENTITY_CORRECT',
            passed: ctx.tenantIdMatches,
            evidence: ctx.tenantIdMatches ? 'Tenant entity correctly bound to candidateId' : 'Tenant ID mismatch',
        });
        criteria.push({
            id: 'BRAND_IDENTITY_CORRECT',
            passed: ctx.brandIdMatches,
            evidence: ctx.brandIdMatches ? 'Brand visual config and tokens resolved accurately' : 'Brand ID mismatch',
        });
        criteria.push({
            id: 'SUBSCRIPTION_CORRECT',
            passed: ctx.subscriptionPlanMatches,
            evidence: ctx.subscriptionPlanMatches ? 'Plan tier and billing cycle match candidate spec' : 'Subscription mismatch',
        });
        criteria.push({
            id: 'ENTITLEMENTS_CORRECT',
            passed: ctx.entitlementsCorrect,
            evidence: ctx.entitlementsCorrect ? 'Allowed modules match subscription catalog' : 'Entitlement resolution discrepancy',
        });
        criteria.push({
            id: 'MEMBERSHIP_CORRECT',
            passed: ctx.membershipOwnerValid,
            evidence: ctx.membershipOwnerValid ? 'Initial OWNER membership created and assigned' : 'Membership validation failed',
        });
        criteria.push({
            id: 'GATEKEEPER_CORRECT',
            passed: ctx.gatekeeperEnforcementVerified,
            evidence: ctx.gatekeeperEnforcementVerified ? 'Gatekeeper module access decisions match plan' : 'Gatekeeper policy failure',
        });
        criteria.push({
            id: 'QUOTA_CORRECT',
            passed: ctx.quotaLimitsEnforced,
            evidence: ctx.quotaLimitsEnforced ? 'Quota boundary enforcement verified' : 'Quota check discrepancy',
        });
        criteria.push({
            id: 'WEB_EXPERIENCE_CORRECT',
            passed: ctx.webExperienceHydrated,
            evidence: ctx.webExperienceHydrated ? 'Web client experience snapshot hydrated without fallback' : 'Web fallback triggered',
        });
        criteria.push({
            id: 'ANDROID_EXPERIENCE_CORRECT',
            passed: ctx.androidExperienceHydrated,
            evidence: ctx.androidExperienceHydrated ? 'Android design tokens and dynamic routes resolved' : 'Android token failure',
        });
        criteria.push({
            id: 'NO_CROSS_TENANT_LEAKAGE',
            passed: ctx.crossTenantLeakageCount === 0,
            evidence: ctx.crossTenantLeakageCount === 0 ? '0 cross-tenant anomalies detected' : `${ctx.crossTenantLeakageCount} leakages detected`,
        });
        criteria.push({
            id: 'NO_PRIVILEGE_ESCALATION',
            passed: ctx.privilegeEscalationCount === 0,
            evidence: ctx.privilegeEscalationCount === 0 ? '0 privilege escalation paths found' : `${ctx.privilegeEscalationCount} escalations found`,
        });
        criteria.push({
            id: 'NO_UNEXPECTED_MUTATIONS',
            passed: ctx.unexpectedMutationCount === 0,
            evidence: ctx.unexpectedMutationCount === 0 ? '0 production mutations executed (pure in-memory)' : `${ctx.unexpectedMutationCount} mutations detected`,
        });
        criteria.push({
            id: 'OBSERVABILITY_COMPLETE',
            passed: ctx.observabilityEventsComplete,
            evidence: ctx.observabilityEventsComplete ? 'Full audit trail logged with zero secrets' : 'Missing audit events or secret leak',
        });
        criteria.push({
            id: 'ROLLBACK_AVAILABLE',
            passed: ctx.rollbackPlanAvailable,
            evidence: ctx.rollbackPlanAvailable ? 'LIFO compensation plan tested with 0 residual state' : 'Rollback unavailable',
        });
        criteria.push({
            id: 'KILL_SWITCH_AVAILABLE',
            passed: ctx.killSwitchArmed,
            evidence: ctx.killSwitchArmed ? 'Canary kill switch ARMED and ready' : 'Kill switch disarmed',
        });
        criteria.push({
            id: 'WEB_ANDROID_PARITY',
            passed: ctx.clientParityVerified,
            evidence: ctx.clientParityVerified ? 'Web and Android dynamic resolutions are 100% equivalent' : 'Parity divergence detected',
        });
        const allPassed = criteria.every(c => c.passed);
        return {
            reportId: `success-report-${now}`,
            allPassed,
            criteria,
            dryRunOnly: true,
            timestamp: now,
        };
    }
}
exports.ActivationSuccessCriteria = ActivationSuccessCriteria;
//# sourceMappingURL=activationSuccessCriteria.js.map