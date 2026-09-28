"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.15
 * PRODUCTION AUTHORIZATION VALIDATOR & GUARD
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionAuthorizationGuard = exports.ProductionAuthorizationValidator = void 0;
const productionActivationModels_1 = require("./productionActivationModels");
class ProductionAuthorizationValidator {
    /**
     * Validates full authorization payload without inferences or defaults.
     */
    static validate(auth, now = Date.now(), consumedAuthIds = new Set()) {
        if (!auth.authorizationId || auth.authorizationId.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_AUTH_ID', reason: 'authorizationId is required' };
        }
        if (consumedAuthIds.has(auth.authorizationId)) {
            return { isValid: false, violationCode: 'REPLAYED_AUTH_ID', reason: 'authorizationId has already been consumed' };
        }
        if (!auth.authorizedBy || auth.authorizedBy.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_AUTHORIZED_BY', reason: 'authorizedBy is required' };
        }
        if (typeof auth.authorizationTimestamp !== 'number' || auth.authorizationTimestamp <= 0) {
            return { isValid: false, violationCode: 'INVALID_AUTH_TIMESTAMP', reason: 'Invalid authorizationTimestamp' };
        }
        if (typeof auth.expirationTimestamp !== 'number' || auth.expirationTimestamp <= 0) {
            return { isValid: false, violationCode: 'INVALID_EXP_TIMESTAMP', reason: 'Invalid expirationTimestamp' };
        }
        if (auth.expirationTimestamp <= auth.authorizationTimestamp) {
            return { isValid: false, violationCode: 'INVALID_WINDOW', reason: 'expirationTimestamp must be strictly greater than authorizationTimestamp' };
        }
        if (now < auth.authorizationTimestamp || now > auth.expirationTimestamp) {
            return { isValid: false, violationCode: 'EXPIRED_WINDOW', reason: 'Current timestamp outside authorized validity window' };
        }
        if (!auth.authorizationLevel || auth.authorizationLevel !== productionActivationModels_1.ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION) {
            return { isValid: false, violationCode: 'INVALID_LEVEL', reason: 'First production execution requires LEVEL_3' };
        }
        if (!auth.tenantId || auth.tenantId.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_TENANT_ID', reason: 'tenantId is required' };
        }
        if (!auth.brandId || auth.brandId.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_BRAND_ID', reason: 'brandId is required' };
        }
        if (!auth.organizationId || auth.organizationId.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_ORG_ID', reason: 'organizationId is required' };
        }
        if (!auth.businessId || auth.businessId.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_BUSINESS_ID', reason: 'businessId is required' };
        }
        if (!auth.branchId || auth.branchId.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_BRANCH_ID', reason: 'branchId is required' };
        }
        if (!auth.administratorUid || auth.administratorUid.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_ADMIN_UID', reason: 'administratorUid is required' };
        }
        if (!auth.subscriptionPlan || auth.subscriptionPlan.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_PLAN', reason: 'subscriptionPlan is required' };
        }
        if (!Array.isArray(auth.authorizedModules) || auth.authorizedModules.length === 0) {
            return { isValid: false, violationCode: 'MISSING_MODULES', reason: 'authorizedModules must be a non-empty array' };
        }
        if (auth.maxProvisioningCount !== 1) {
            return { isValid: false, violationCode: 'INVALID_MAX_PROVISIONING', reason: 'maxProvisioningCount must be exactly 1' };
        }
        if (auth.maxClaimMutationCount !== 1) {
            return { isValid: false, violationCode: 'INVALID_MAX_CLAIMS', reason: 'maxClaimMutationCount must be exactly 1' };
        }
        if (typeof auth.maxCanaryRequests !== 'number' || auth.maxCanaryRequests > 10) {
            return { isValid: false, violationCode: 'CANARY_REQUEST_OVERFLOW', reason: 'maxCanaryRequests must be <= 10' };
        }
        if (typeof auth.maxCanaryPercentage !== 'number' || auth.maxCanaryPercentage > 0.01) {
            return { isValid: false, violationCode: 'CANARY_PERCENTAGE_OVERFLOW', reason: 'maxCanaryPercentage must be <= 0.01 (1%)' };
        }
        // Strict locks on non-transitive gates
        if (auth.rolloutAuthorized) {
            return { isValid: false, violationCode: 'ROLLOUT_UNAUTHORIZED', reason: 'rolloutAuthorized cannot be true in LEVEL_3' };
        }
        if (auth.canaryExpansionAuthorized) {
            return { isValid: false, violationCode: 'CANARY_EXPANSION_UNAUTHORIZED', reason: 'canaryExpansionAuthorized cannot be true in LEVEL_3' };
        }
        if (auth.massProvisioningAuthorized) {
            return { isValid: false, violationCode: 'MASS_PROVISIONING_UNAUTHORIZED', reason: 'massProvisioningAuthorized cannot be true' };
        }
        if (auth.massClaimsAuthorized) {
            return { isValid: false, violationCode: 'MASS_CLAIMS_UNAUTHORIZED', reason: 'massClaimsAuthorized cannot be true' };
        }
        if (auth.migrationAuthorized) {
            return { isValid: false, violationCode: 'MIGRATION_UNAUTHORIZED', reason: 'migrationAuthorized requires independent authorization' };
        }
        if (!auth.killSwitchRequired) {
            return { isValid: false, violationCode: 'KILL_SWITCH_REQUIRED', reason: 'killSwitchRequired must be true' };
        }
        if (!auth.rollbackRequired) {
            return { isValid: false, violationCode: 'ROLLBACK_REQUIRED', reason: 'rollbackRequired must be true' };
        }
        if (!auth.humanDecisionAfterCanaryRequired) {
            return { isValid: false, violationCode: 'HUMAN_DECISION_REQUIRED', reason: 'humanDecisionAfterCanaryRequired must be true' };
        }
        if (!auth.authorizationSignature || auth.authorizationSignature.trim().length === 0) {
            return { isValid: false, violationCode: 'MISSING_SIGNATURE', reason: 'authorizationSignature is required' };
        }
        return { isValid: true };
    }
}
exports.ProductionAuthorizationValidator = ProductionAuthorizationValidator;
class ProductionAuthorizationGuard {
    constructor() {
        this.isLocked = true;
        this.currentAuthorization = null;
        this.consumedAuthorizations = new Set();
    }
    isProductionLocked() {
        return this.isLocked;
    }
    unlockWithAuthorization(auth, now = Date.now()) {
        const validation = ProductionAuthorizationValidator.validate(auth, now, this.consumedAuthorizations);
        if (!validation.isValid) {
            this.isLocked = true;
            return { success: false, reason: validation.reason };
        }
        this.currentAuthorization = auth;
        this.isLocked = false;
        return { success: true };
    }
    consumeCurrentAuthorization() {
        if (this.currentAuthorization) {
            this.consumedAuthorizations.add(this.currentAuthorization.authorizationId);
            this.currentAuthorization = null;
            this.isLocked = true;
        }
    }
    lock() {
        this.isLocked = true;
        this.currentAuthorization = null;
    }
}
exports.ProductionAuthorizationGuard = ProductionAuthorizationGuard;
//# sourceMappingURL=productionAuthorizationValidator.js.map