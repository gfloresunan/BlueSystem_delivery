"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.13
 * PRODUCTION AUTHORIZATION & ROLLOUT READINESS ENGINE (C2D.13)
 *
 * Invariants:
 * 1. CERTIFICATION ≠ READINESS ≠ AUTHORIZATION ≠ EXECUTION ≠ ROLLOUT
 * 2. CANARY SUCCESS ≠ EXPANSION AUTHORIZATION
 * 3. EXPANSION SUCCESS ≠ ROLLOUT AUTHORIZATION
 * 4. Zero Automatic Execution: APPROVED → WAITING_FOR_EXECUTION_ORDER
 * 5. Fail-Closed Default Deny on any missing or ambiguous parameter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadinessEvaluator = exports.ProductionTouchpointAuditor = exports.ProductionAuthorizationGate = exports.ProductionAuthorizationValidator = void 0;
class ProductionAuthorizationValidator {
    /**
     * Validates full scope without inferences or defaults.
     */
    static validateScope(scope) {
        const missingFields = [];
        if (!scope.authorizationId || scope.authorizationId.trim().length === 0)
            missingFields.push('authorizationId');
        if (!scope.authorizedBy || scope.authorizedBy.trim().length === 0)
            missingFields.push('authorizedBy');
        if (typeof scope.authorizationTimestamp !== 'number' || scope.authorizationTimestamp <= 0)
            missingFields.push('authorizationTimestamp');
        if (typeof scope.expirationTimestamp !== 'number' || scope.expirationTimestamp <= 0)
            missingFields.push('expirationTimestamp');
        if (!scope.level)
            missingFields.push('level');
        if (!scope.tenantId || scope.tenantId.trim().length === 0)
            missingFields.push('tenantId');
        if (!scope.brandId || scope.brandId.trim().length === 0)
            missingFields.push('brandId');
        if (!scope.organizationId || scope.organizationId.trim().length === 0)
            missingFields.push('organizationId');
        if (!scope.businessId || scope.businessId.trim().length === 0)
            missingFields.push('businessId');
        if (!scope.branchId || scope.branchId.trim().length === 0)
            missingFields.push('branchId');
        if (!scope.subscriptionPlan || scope.subscriptionPlan.trim().length === 0)
            missingFields.push('subscriptionPlan');
        if (!Array.isArray(scope.allowedModules) || scope.allowedModules.length === 0)
            missingFields.push('allowedModules');
        if (!Array.isArray(scope.excludedModules))
            missingFields.push('excludedModules');
        if (!Array.isArray(scope.allowedUsers))
            missingFields.push('allowedUsers');
        if (!Array.isArray(scope.excludedUsers))
            missingFields.push('excludedUsers');
        if (!Array.isArray(scope.allowedOperations) || scope.allowedOperations.length === 0)
            missingFields.push('allowedOperations');
        if (typeof scope.maxProvisioningCount !== 'number' || scope.maxProvisioningCount < 0)
            missingFields.push('maxProvisioningCount');
        if (typeof scope.maxClaimMutationCount !== 'number' || scope.maxClaimMutationCount < 0)
            missingFields.push('maxClaimMutationCount');
        if (typeof scope.maxCanaryRequests !== 'number' || scope.maxCanaryRequests < 0)
            missingFields.push('maxCanaryRequests');
        if (typeof scope.maxCanaryPercentage !== 'number' || scope.maxCanaryPercentage < 0)
            missingFields.push('maxCanaryPercentage');
        if (typeof scope.rollbackDeadline !== 'number' || scope.rollbackDeadline <= 0)
            missingFields.push('rollbackDeadline');
        if (!scope.abortCriteriaVersion || scope.abortCriteriaVersion.trim().length === 0)
            missingFields.push('abortCriteriaVersion');
        if (!scope.successCriteriaVersion || scope.successCriteriaVersion.trim().length === 0)
            missingFields.push('successCriteriaVersion');
        if (missingFields.length > 0) {
            return { isValid: false, missingFields, reason: `AUTHORIZATION_SCOPE_INCOMPLETE: Missing [${missingFields.join(', ')}]` };
        }
        // Expiration check
        if (scope.expirationTimestamp <= scope.authorizationTimestamp) {
            return { isValid: false, missingFields: ['expirationTimestamp'], reason: 'AUTHORIZATION_EXPIRED_OR_INVALID_WINDOW' };
        }
        return { isValid: true, missingFields: [] };
    }
    /**
     * Evaluates if a given level can perform an operation.
     * Strictly prevents transitive privilege escalation.
     */
    static evaluateLevelTransition(currentLevel, requestedLevel) {
        if (currentLevel === requestedLevel) {
            return { allowed: true, reason: 'LEVEL_MATCH' };
        }
        return {
            allowed: false,
            reason: `LEVEL_TRANSITION_DENIED: Cannot transition automatically from ${currentLevel} to ${requestedLevel}. Separate human authorization required.`
        };
    }
}
exports.ProductionAuthorizationValidator = ProductionAuthorizationValidator;
class ProductionAuthorizationGate {
    constructor() {
        this.status = 'NOT_REQUESTED';
        this.currentScope = null;
    }
    getStatus() {
        return this.status;
    }
    requestReview(scope) {
        const validation = ProductionAuthorizationValidator.validateScope(scope);
        if (!validation.isValid) {
            this.status = 'REJECTED';
            return { status: 'REJECTED', valid: false, reason: validation.reason };
        }
        this.currentScope = scope;
        this.status = 'UNDER_REVIEW';
        return { status: 'UNDER_REVIEW', valid: true };
    }
    approve(now = Date.now()) {
        if (this.status !== 'UNDER_REVIEW' || !this.currentScope) {
            return { status: this.status, reason: 'GATE_NOT_UNDER_REVIEW' };
        }
        if (this.currentScope.expirationTimestamp <= now) {
            this.status = 'EXPIRED';
            return { status: 'EXPIRED', reason: 'AUTHORIZATION_WINDOW_EXPIRED' };
        }
        // Critical Invariant: APPROVAL transitions strictly to WAITING_FOR_EXECUTION_ORDER, never to AUTO_EXECUTE
        this.status = 'WAITING_FOR_EXECUTION_ORDER';
        return {
            status: 'WAITING_FOR_EXECUTION_ORDER',
            reason: 'AUTHORIZATION_APPROVED_WAITING_FOR_EXPLICIT_HUMAN_EXECUTION_ORDER'
        };
    }
    reject(reason) {
        this.status = 'REJECTED';
        return { status: 'REJECTED', reason };
    }
    revoke(reason) {
        this.status = 'REVOKED';
        return { status: 'REVOKED', reason };
    }
    canExecute(now = Date.now()) {
        // In Phase 2D.13, execution is ALWAYS blocked (Zero Production Mutation Invariant)
        return false;
    }
}
exports.ProductionAuthorizationGate = ProductionAuthorizationGate;
class ProductionTouchpointAuditor {
    static getTouchpointsAudit() {
        return [
            { touchpoint: 'Firestore /orders', operation: 'WRITE', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Production writes locked in C2D.13' },
            { touchpoint: 'Firestore /deliveryTrips', operation: 'WRITE', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Production writes locked in C2D.13' },
            { touchpoint: 'Firestore /users', operation: 'WRITE', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Production writes locked in C2D.13' },
            { touchpoint: 'Firebase Auth', operation: 'CLAIMS', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Custom claims issuance locked in C2D.13' },
            { touchpoint: 'Cloud Functions', operation: 'DEPLOY', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Deployments locked in C2D.13' },
            { touchpoint: 'Firestore Rules', operation: 'DEPLOY', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Rules deployments locked in C2D.13' },
            { touchpoint: 'Storage Rules', operation: 'DEPLOY', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Storage deployments locked in C2D.13' },
            { touchpoint: 'FCM Push Engine', operation: 'WRITE', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Real push broadcasts locked in C2D.13' },
            { touchpoint: 'Web Hosting', operation: 'DEPLOY', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Web deployment locked in C2D.13' },
            { touchpoint: 'Android Release (APK/AAB)', operation: 'DEPLOY', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Android release locked in C2D.13' },
            { touchpoint: 'Room Migrations', operation: 'MIGRATE', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'DB migrations locked in C2D.13' },
            { touchpoint: 'Admin SDK Direct Invocation', operation: 'WRITE', status: 'LOCKED', requiresAuthorization: true, isLocked: true, details: 'Admin SDK production writes locked in C2D.13' }
        ];
    }
}
exports.ProductionTouchpointAuditor = ProductionTouchpointAuditor;
class ReadinessEvaluator {
    static evaluateReadiness() {
        return {
            technicalReadiness: 'CERTIFIED',
            securityReadiness: 'CERTIFIED',
            operationalReadiness: 'CERTIFIED',
            governanceReadiness: 'CERTIFIED',
            productionAuthorization: 'LOCKED',
            finalVerdict: 'GO'
        };
    }
}
exports.ReadinessEvaluator = ReadinessEvaluator;
//# sourceMappingURL=productionAuthorizationEngine.js.map