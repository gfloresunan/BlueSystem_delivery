"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.17
 * HUMAN PRODUCTION AUTHORIZATION CONTRACTS & VALIDATOR (C2D.17)
 *
 * Architecture: ONE CORE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Invariant: CERTIFICATION ≠ INTEGRATION ≠ READINESS ≠ AUTHORIZATION ≠ EXECUTION ≠ CANARY ≠ EXPANSION ≠ ROLLOUT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanAuthorizationValidator = exports.ProductionAuthorizationLevel = void 0;
var ProductionAuthorizationLevel;
(function (ProductionAuthorizationLevel) {
    ProductionAuthorizationLevel["LEVEL_0_NO_AUTHORIZATION"] = "LEVEL_0_NO_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_1_READINESS_REVIEW"] = "LEVEL_1_READINESS_REVIEW";
    ProductionAuthorizationLevel["LEVEL_2_DEPLOYMENT_AUTHORIZATION"] = "LEVEL_2_DEPLOYMENT_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION"] = "LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_4_FIRST_USER_CLAIMS_AUTHORIZATION"] = "LEVEL_4_FIRST_USER_CLAIMS_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_5_CONTROLLED_CANARY_AUTHORIZATION"] = "LEVEL_5_CONTROLLED_CANARY_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION"] = "LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION"] = "LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION";
})(ProductionAuthorizationLevel || (exports.ProductionAuthorizationLevel = ProductionAuthorizationLevel = {}));
class HumanAuthorizationValidator {
    /**
     * Validates all requirements of Human Authorization for C2D.17.
     * Fail-closed on any missing, invalid, or ambiguous field.
     */
    static validate(auth, now = Date.now(), consumedAuthIds = new Set()) {
        const missing = [];
        if (!auth.authorizationId || auth.authorizationId.trim().length === 0)
            missing.push('authorizationId');
        if (!auth.authorizationVersion || auth.authorizationVersion.trim().length === 0)
            missing.push('authorizationVersion');
        if (!auth.authorizedBy || auth.authorizedBy.trim().length === 0)
            missing.push('authorizedBy');
        if (!auth.authorizationReason || auth.authorizationReason.trim().length === 0)
            missing.push('authorizationReason');
        if (typeof auth.authorizationTimestamp !== 'number' || auth.authorizationTimestamp <= 0)
            missing.push('authorizationTimestamp');
        if (typeof auth.expirationTimestamp !== 'number' || auth.expirationTimestamp <= 0)
            missing.push('expirationTimestamp');
        if (!auth.authorizationLevel)
            missing.push('authorizationLevel');
        if (!auth.environment)
            missing.push('environment');
        if (!auth.firebaseProjectId || auth.firebaseProjectId.trim().length === 0)
            missing.push('firebaseProjectId');
        if (!auth.targetScope)
            missing.push('targetScope');
        if (!auth.subscription)
            missing.push('subscription');
        if (!auth.limits)
            missing.push('limits');
        if (!auth.independentGates)
            missing.push('independentGates');
        if (!auth.governanceGuards)
            missing.push('governanceGuards');
        if (!auth.scopeHash || auth.scopeHash.trim().length === 0)
            missing.push('scopeHash');
        if (!auth.authorizationSignature || auth.authorizationSignature.trim().length === 0)
            missing.push('authorizationSignature');
        if (missing.length > 0) {
            return { isValid: false, violationCode: 'MISSING_FIELDS', reason: `Missing required fields: [${missing.join(', ')}]`, missingFields: missing };
        }
        // Uniqueness & Replay Check
        if (consumedAuthIds.has(auth.authorizationId)) {
            return { isValid: false, violationCode: 'REPLAYED_AUTHORIZATION', reason: 'Authorization ID has already been consumed' };
        }
        // Validity Window Check
        if (auth.expirationTimestamp <= auth.authorizationTimestamp) {
            return { isValid: false, violationCode: 'INVALID_VALIDITY_WINDOW', reason: 'expirationTimestamp must be strictly greater than authorizationTimestamp' };
        }
        if (now < auth.authorizationTimestamp || now > auth.expirationTimestamp) {
            return { isValid: false, violationCode: 'EXPIRED_AUTHORIZATION_WINDOW', reason: 'Current timestamp outside authorized validity window' };
        }
        // Authorization Level Check
        if (auth.authorizationLevel !== ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION) {
            return { isValid: false, violationCode: 'INVALID_AUTHORIZATION_LEVEL', reason: 'First Real Tenant Execution requires LEVEL_3' };
        }
        // Environment & Target Project
        if (auth.environment !== 'PRODUCTION') {
            return { isValid: false, violationCode: 'ENVIRONMENT_MISMATCH', reason: 'Environment must match PRODUCTION' };
        }
        // Target Scope Check
        const ts = auth.targetScope;
        if (!ts.tenantId || ts.tenantId.trim().length === 0)
            return { isValid: false, violationCode: 'MISSING_TENANT_ID', reason: 'tenantId is required' };
        if (!ts.brandId || ts.brandId.trim().length === 0)
            return { isValid: false, violationCode: 'MISSING_BRAND_ID', reason: 'brandId is required' };
        if (!ts.organizationId || ts.organizationId.trim().length === 0)
            return { isValid: false, violationCode: 'MISSING_ORG_ID', reason: 'organizationId is required' };
        if (!ts.businessId || ts.businessId.trim().length === 0)
            return { isValid: false, violationCode: 'MISSING_BIZ_ID', reason: 'businessId is required' };
        if (!ts.branchId || ts.branchId.trim().length === 0)
            return { isValid: false, violationCode: 'MISSING_BRANCH_ID', reason: 'branchId is required' };
        if (!ts.administratorUid || ts.administratorUid.trim().length === 0)
            return { isValid: false, violationCode: 'MISSING_ADMIN_UID', reason: 'administratorUid is required' };
        // Wildcard Rejection
        if (ts.tenantId === '*' || ts.brandId === '*' || ts.administratorUid === '*') {
            return { isValid: false, violationCode: 'WILDCARD_NOT_ALLOWED', reason: 'Wildcard identifiers are forbidden in production' };
        }
        // Operational Limits
        const lm = auth.limits;
        if (lm.maxProvisioningCount !== 1)
            return { isValid: false, violationCode: 'MASS_PROVISIONING_FORBIDDEN', reason: 'maxProvisioningCount must be exactly 1' };
        if (lm.maxClaimMutationCount !== 1)
            return { isValid: false, violationCode: 'MASS_CLAIMS_FORBIDDEN', reason: 'maxClaimMutationCount must be exactly 1' };
        if (lm.maxCanaryRequests > 10)
            return { isValid: false, violationCode: 'CANARY_REQUESTS_OVERFLOW', reason: 'maxCanaryRequests must be <= 10' };
        if (lm.maxCanaryPercentage > 0.01)
            return { isValid: false, violationCode: 'CANARY_PERCENTAGE_OVERFLOW', reason: 'maxCanaryPercentage must be <= 0.01 (1%)' };
        // Independent Gates Lock (Non-Transitivity)
        const ig = auth.independentGates;
        if (ig.deploymentAuthorized)
            return { isValid: false, violationCode: 'DEPLOYMENT_GATE_UNAUTHORIZED', reason: 'deploymentAuthorized cannot be TRUE in LEVEL_3' };
        if (ig.migrationAuthorized)
            return { isValid: false, violationCode: 'MIGRATION_GATE_UNAUTHORIZED', reason: 'migrationAuthorized cannot be TRUE in LEVEL_3' };
        if (ig.canaryExpansionAuthorized)
            return { isValid: false, violationCode: 'CANARY_EXPANSION_UNAUTHORIZED', reason: 'canaryExpansionAuthorized cannot be TRUE in LEVEL_3' };
        if (ig.rolloutAuthorized)
            return { isValid: false, violationCode: 'ROLLOUT_UNAUTHORIZED', reason: 'rolloutAuthorized cannot be TRUE in LEVEL_3 (ADR-014)' };
        if (ig.massProvisioningAuthorized)
            return { isValid: false, violationCode: 'MASS_PROV_UNAUTHORIZED', reason: 'massProvisioningAuthorized cannot be TRUE' };
        if (ig.massClaimsAuthorized)
            return { isValid: false, violationCode: 'MASS_CLAIMS_UNAUTHORIZED', reason: 'massClaimsAuthorized cannot be TRUE' };
        // Governance Guards
        const gg = auth.governanceGuards;
        if (!gg.killSwitchRequired)
            return { isValid: false, violationCode: 'KILL_SWITCH_REQUIRED', reason: 'killSwitchRequired must be true' };
        if (!gg.rollbackRequired)
            return { isValid: false, violationCode: 'ROLLBACK_REQUIRED', reason: 'rollbackRequired must be true' };
        if (!gg.humanDecisionAfterCanaryRequired)
            return { isValid: false, violationCode: 'HUMAN_DECISION_REQUIRED', reason: 'humanDecisionAfterCanaryRequired must be true' };
        return { isValid: true };
    }
}
exports.HumanAuthorizationValidator = HumanAuthorizationValidator;
//# sourceMappingURL=humanAuthorizationValidator.js.map