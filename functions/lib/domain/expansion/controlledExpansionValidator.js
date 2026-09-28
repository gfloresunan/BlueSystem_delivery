"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.19
 * CONTROLLED EXPANSION AUTHORIZATION VALIDATOR & CONTRACTS (C2D.19)
 *
 * Architecture: ONE CORE / ONE CODEBASE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND / WHITE-LABEL
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Protocol: C2D.19 (LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION)
 * Invariants:
 *   CERTIFICATION ≠ AUTHORIZATION
 *   AUTHORIZATION ≠ EXECUTION
 *   EXECUTION ≠ EXPANSION
 *   CANARY SUCCESS ≠ CANARY EXPANSION
 *   CANARY SUCCESS ≠ ROLLOUT
 *   LEVEL_6 ≠ LEVEL_7
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlledExpansionValidator = void 0;
const humanAuthorizationValidator_1 = require("../humanAuthorization/humanAuthorizationValidator");
class ControlledExpansionValidator {
    /**
     * Validates all requirements of LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION for C2D.19.
     * Fail-closed on any missing, invalid, out-of-scope or ambiguous field.
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
        if (auth.authorizationType !== 'CONTROLLED_EXPANSION')
            missing.push('authorizationType');
        if (typeof auth.authorizationTimestamp !== 'number' || auth.authorizationTimestamp <= 0)
            missing.push('authorizationTimestamp');
        if (typeof auth.expirationTimestamp !== 'number' || auth.expirationTimestamp <= 0)
            missing.push('expirationTimestamp');
        if (!auth.authorizationLevel)
            missing.push('authorizationLevel');
        if (auth.status !== 'HUMAN_AUTHORIZED')
            missing.push('status');
        if (!auth.environment)
            missing.push('environment');
        if (!auth.firebaseProjectId || auth.firebaseProjectId.trim().length === 0)
            missing.push('firebaseProjectId');
        if (!auth.scopeBounds)
            missing.push('scopeBounds');
        if (!auth.targetScope)
            missing.push('targetScope');
        if (!auth.subscription)
            missing.push('subscription');
        if (!auth.canary)
            missing.push('canary');
        if (!auth.independentGates)
            missing.push('independentGates');
        if (!auth.governanceGuards)
            missing.push('governanceGuards');
        if (!auth.scopeHash || auth.scopeHash.trim().length === 0)
            missing.push('scopeHash');
        if (!auth.authorizationSignature || auth.authorizationSignature.trim().length === 0)
            missing.push('authorizationSignature');
        if (missing.length > 0) {
            return {
                isValid: false,
                violationCode: 'MISSING_FIELDS',
                reason: `Missing required fields: [${missing.join(', ')}]`,
                missingFields: missing
            };
        }
        // 1. Uniqueness & Replay Protection Check
        if (consumedAuthIds.has(auth.authorizationId)) {
            return {
                isValid: false,
                violationCode: 'REPLAYED_AUTHORIZATION',
                reason: 'Authorization ID has already been consumed and cannot be replayed'
            };
        }
        // 2. Validity Window Check
        if (auth.expirationTimestamp <= auth.authorizationTimestamp) {
            return {
                isValid: false,
                violationCode: 'INVALID_VALIDITY_WINDOW',
                reason: 'expirationTimestamp must be strictly greater than authorizationTimestamp'
            };
        }
        if (now < auth.authorizationTimestamp || now > auth.expirationTimestamp) {
            return {
                isValid: false,
                violationCode: 'EXPIRED_AUTHORIZATION_WINDOW',
                reason: 'Current timestamp outside authorized validity window'
            };
        }
        // 3. Strict Authorization Level Validation (Must be strictly LEVEL_6)
        if (auth.authorizationLevel !== humanAuthorizationValidator_1.ProductionAuthorizationLevel.LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION) {
            return {
                isValid: false,
                violationCode: 'INVALID_AUTHORIZATION_LEVEL',
                reason: `Expected LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION but received ${auth.authorizationLevel}`
            };
        }
        // 4. Environment Validation
        if (auth.environment !== 'PRODUCTION') {
            return {
                isValid: false,
                violationCode: 'ENVIRONMENT_MISMATCH',
                reason: 'Environment must match PRODUCTION for live expansion'
            };
        }
        // 5. Scope Bounds Validation (Confinement to exactly +1 entity)
        const bounds = auth.scopeBounds;
        if (bounds.additionalTenants !== 1) {
            return {
                isValid: false,
                violationCode: 'INVALID_ADDITIONAL_TENANTS',
                reason: 'additionalTenants must be strictly equal to 1'
            };
        }
        if (bounds.totalActiveTenants !== 2) {
            return {
                isValid: false,
                violationCode: 'INVALID_TOTAL_ACTIVE_TENANTS',
                reason: 'totalActiveTenants must be strictly equal to 2'
            };
        }
        if (bounds.additionalBrands !== 1) {
            return {
                isValid: false,
                violationCode: 'INVALID_ADDITIONAL_BRANDS',
                reason: 'additionalBrands must be strictly equal to 1'
            };
        }
        if (bounds.additionalBusinesses !== 1) {
            return {
                isValid: false,
                violationCode: 'INVALID_ADDITIONAL_BUSINESSES',
                reason: 'additionalBusinesses must be strictly equal to 1'
            };
        }
        if (bounds.additionalBranches !== 1) {
            return {
                isValid: false,
                violationCode: 'INVALID_ADDITIONAL_BRANCHES',
                reason: 'additionalBranches must be strictly equal to 1'
            };
        }
        if (bounds.additionalAdmins !== 1) {
            return {
                isValid: false,
                violationCode: 'INVALID_ADDITIONAL_ADMINS',
                reason: 'additionalAdmins must be strictly equal to 1'
            };
        }
        // 6. Target Scope Validation & Wildcard Rejection
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
        if (ts.tenantId === '*' || ts.brandId === '*' || ts.administratorUid === '*' || ts.organizationId === '*' || ts.businessId === '*' || ts.branchId === '*') {
            return { isValid: false, violationCode: 'WILDCARD_NOT_ALLOWED', reason: 'Wildcard identifiers are strictly forbidden' };
        }
        // 7. Existence & Collision Check
        if (this.EXISTING_TENANT_IDS.has(ts.tenantId)) {
            return {
                isValid: false,
                violationCode: 'TENANT_COLLISION',
                reason: `Target tenant ${ts.tenantId} collides with existing tenant (takeover prevented)`
            };
        }
        if (this.EXISTING_BRAND_IDS.has(ts.brandId)) {
            return {
                isValid: false,
                violationCode: 'BRAND_COLLISION',
                reason: `Target brand ${ts.brandId} collides with existing brand (takeover prevented)`
            };
        }
        if (this.EXISTING_ADMIN_UIDS.has(ts.administratorUid)) {
            return {
                isValid: false,
                violationCode: 'ADMIN_COLLISION',
                reason: `Target admin ${ts.administratorUid} collides with existing admin (takeover prevented)`
            };
        }
        // 8. Canary Limits Check
        const canary = auth.canary;
        if (!canary.authorized) {
            return { isValid: false, violationCode: 'CANARY_UNAUTHORIZED', reason: 'Canary must be authorized in expansion payload' };
        }
        if (canary.maxRequests > 10) {
            return { isValid: false, violationCode: 'CANARY_REQUESTS_OVERFLOW', reason: 'maxRequests must be <= 10' };
        }
        if (canary.maxPercentage > 0.01) {
            return { isValid: false, violationCode: 'CANARY_PERCENTAGE_OVERFLOW', reason: 'maxPercentage must be <= 0.01 (1%)' };
        }
        // 9. Independent Gates Lock (Non-Transitivity: LEVEL_6 ≠ LEVEL_7, No Rollout, No Mass Ops)
        const ig = auth.independentGates;
        if (ig.rolloutAuthorized) {
            return { isValid: false, violationCode: 'ROLLOUT_UNAUTHORIZED', reason: 'rolloutAuthorized cannot be TRUE in LEVEL_6 (ADR-014)' };
        }
        if (ig.deploymentAuthorized) {
            return { isValid: false, violationCode: 'DEPLOYMENT_GATE_UNAUTHORIZED', reason: 'deploymentAuthorized cannot be TRUE in LEVEL_6' };
        }
        if (ig.migrationAuthorized) {
            return { isValid: false, violationCode: 'MIGRATION_GATE_UNAUTHORIZED', reason: 'migrationAuthorized cannot be TRUE in LEVEL_6' };
        }
        if (ig.canaryExpansionAuthorized) {
            return { isValid: false, violationCode: 'CANARY_EXPANSION_UNAUTHORIZED', reason: 'canaryExpansionAuthorized cannot be TRUE in LEVEL_6' };
        }
        if (ig.massProvisioningAuthorized) {
            return { isValid: false, violationCode: 'MASS_PROV_UNAUTHORIZED', reason: 'massProvisioningAuthorized cannot be TRUE' };
        }
        if (ig.massClaimsAuthorized) {
            return { isValid: false, violationCode: 'MASS_CLAIMS_UNAUTHORIZED', reason: 'massClaimsAuthorized cannot be TRUE' };
        }
        // 10. Governance Guards Check
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
exports.ControlledExpansionValidator = ControlledExpansionValidator;
ControlledExpansionValidator.EXISTING_TENANT_IDS = new Set(['ten-live-commercial-01']);
ControlledExpansionValidator.EXISTING_BRAND_IDS = new Set(['brand-live-commercial-01']);
ControlledExpansionValidator.EXISTING_ADMIN_UIDS = new Set(['usr-live-admin-01']);
//# sourceMappingURL=controlledExpansionValidator.js.map