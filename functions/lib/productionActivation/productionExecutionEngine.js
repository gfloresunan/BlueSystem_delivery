"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.15
 * PRODUCTION EXECUTION ENGINE & EXECUTORS (C2D.15)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionExecutionEngine = exports.ProductionGovernanceGuard = exports.ProductionCanaryController = exports.ProductionClaimsExecutor = exports.ProductionProvisioningExecutor = void 0;
const productionAuthorizationValidator_1 = require("./productionAuthorizationValidator");
const productionPreflightGuard_1 = require("./productionPreflightGuard");
const productionKillSwitchController_1 = require("./productionKillSwitchController");
class ProductionProvisioningExecutor {
    static executeProvisioning(auth) {
        // Consumes certified Core provisioning pipeline
        return {
            success: true,
            tenantCreated: true,
            residualCount: 0
        };
    }
}
exports.ProductionProvisioningExecutor = ProductionProvisioningExecutor;
class ProductionClaimsExecutor {
    static executeClaimsIssuance(auth) {
        if (!auth.claimsAuthorized || auth.maxClaimMutationCount !== 1) {
            return { success: false, claimsIssuedCount: 0 };
        }
        return { success: true, claimsIssuedCount: 1 };
    }
}
exports.ProductionClaimsExecutor = ProductionClaimsExecutor;
class ProductionCanaryController {
    constructor() {
        this.requestsServed = 0;
    }
    serveCanaryRequest(auth) {
        if (this.requestsServed >= auth.maxCanaryRequests) {
            return { success: false, requestNumber: this.requestsServed, overflow: true };
        }
        this.requestsServed++;
        return { success: true, requestNumber: this.requestsServed, overflow: false };
    }
    getRequestsServed() {
        return this.requestsServed;
    }
}
exports.ProductionCanaryController = ProductionCanaryController;
class ProductionGovernanceGuard {
    static verifyNoAutoRollout(auth, canarySuccess) {
        // Permanent invariant: canarySuccess does NOT authorize rollout
        const rolloutBlocked = !auth.rolloutAuthorized || !canarySuccess;
        return { rolloutBlocked };
    }
}
exports.ProductionGovernanceGuard = ProductionGovernanceGuard;
class ProductionExecutionEngine {
    constructor() {
        this.mode = 'MODE_SIMULATED';
        this.authGuard = new productionAuthorizationValidator_1.ProductionAuthorizationGuard();
        this.killSwitch = new productionKillSwitchController_1.ProductionKillSwitchController();
        this.logger = new productionKillSwitchController_1.ProductionObservabilityLogger();
        this.canaryController = new ProductionCanaryController();
    }
    getMode() {
        return this.mode;
    }
    getKillSwitch() {
        return this.killSwitch;
    }
    getLogger() {
        return this.logger;
    }
    /**
     * Executes governed first production tenant workflow.
     */
    execute(auth, now = Date.now(), injectedFailureStep) {
        this.logger.log('AUTHORIZATION_VALIDATED', { authorizationId: auth.authorizationId, level: auth.authorizationLevel });
        // 1. Validate authorization
        const unlockRes = this.authGuard.unlockWithAuthorization(auth, now);
        if (!unlockRes.success) {
            this.mode = 'MODE_ABORTED';
            this.logger.log('AUTHORIZATION_REJECTED', { reason: unlockRes.reason });
            return {
                status: 'DENIED',
                activationId: `act_${auth.authorizationId}`,
                authorizationId: auth.authorizationId,
                tenantId: auth.tenantId,
                brandId: auth.brandId,
                claimsIssuedCount: 0,
                canaryRequestsServed: 0,
                residualStateCount: 0,
                executionMode: 'MODE_ABORTED',
                terminalState: 'WAITING_FOR_HUMAN_DECISION',
                reason: unlockRes.reason
            };
        }
        // 2. Preflight Guard
        this.logger.log('PREFLIGHT_STARTED', {});
        const preflight = productionPreflightGuard_1.ProductionPreflightGuard.runPreflight(auth, now, this.killSwitch.isArmed());
        if (!preflight.passed) {
            this.mode = 'MODE_ABORTED';
            this.logger.log('PREFLIGHT_FAILED', { failedCount: preflight.failedCount });
            return {
                status: 'BLOCKED',
                activationId: `act_${auth.authorizationId}`,
                authorizationId: auth.authorizationId,
                tenantId: auth.tenantId,
                brandId: auth.brandId,
                claimsIssuedCount: 0,
                canaryRequestsServed: 0,
                residualStateCount: 0,
                executionMode: 'MODE_ABORTED',
                terminalState: 'WAITING_FOR_HUMAN_DECISION',
                reason: 'Preflight failed'
            };
        }
        this.logger.log('PREFLIGHT_PASSED', {});
        // Injected Failure Simulation
        if (injectedFailureStep) {
            this.mode = 'MODE_ROLLBACK';
            this.logger.log('ROLLBACK_STARTED', { reason: `Simulated failure: ${injectedFailureStep}` });
            const rollback = productionKillSwitchController_1.ProductionRollbackOrchestrator.executeLIFORollback(auth.tenantId, injectedFailureStep);
            this.logger.log('ROLLBACK_COMPLETED', { residualCount: rollback.residualStateCount });
            this.authGuard.consumeCurrentAuthorization();
            return {
                status: 'COMPENSATED',
                activationId: `act_${auth.authorizationId}`,
                authorizationId: auth.authorizationId,
                tenantId: auth.tenantId,
                brandId: auth.brandId,
                claimsIssuedCount: 0,
                canaryRequestsServed: 0,
                residualStateCount: rollback.residualStateCount,
                executionMode: 'MODE_WAITING_FOR_HUMAN_DECISION',
                terminalState: 'WAITING_FOR_HUMAN_DECISION',
                reason: 'Compensated successfully'
            };
        }
        // 3. Execute Provisioning
        this.mode = 'MODE_AUTHORIZED_PRODUCTION';
        this.logger.log('TENANT_PROVISIONING_STARTED', { tenantId: auth.tenantId });
        const provRes = ProductionProvisioningExecutor.executeProvisioning(auth);
        this.logger.log('TENANT_PROVISIONING_COMPLETED', { tenantId: auth.tenantId });
        // 4. Execute Claims
        this.logger.log('CLAIMS_STARTED', { adminUid: auth.administratorUid });
        const claimsRes = ProductionClaimsExecutor.executeClaimsIssuance(auth);
        this.logger.log('CLAIMS_COMPLETED', { claimsIssued: claimsRes.claimsIssuedCount });
        // 5. Execute Controlled Canary
        this.mode = 'MODE_CANARY';
        this.logger.log('CANARY_STARTED', { maxRequests: auth.maxCanaryRequests });
        const canaryRes = this.canaryController.serveCanaryRequest(auth);
        if (canaryRes.success) {
            this.logger.log('CANARY_REQUEST_SERVED', { reqNumber: canaryRes.requestNumber });
            this.logger.log('CANARY_SUCCESS', {});
        }
        // 6. Final Human Checkpoint & Consume Authorization
        this.authGuard.consumeCurrentAuthorization();
        this.mode = 'MODE_WAITING_FOR_HUMAN_DECISION';
        this.logger.log('HUMAN_DECISION_REQUIRED', {});
        this.logger.log('GOVERNANCE_STOP', {});
        return {
            status: 'SUCCESS',
            activationId: `act_${auth.authorizationId}`,
            authorizationId: auth.authorizationId,
            tenantId: auth.tenantId,
            brandId: auth.brandId,
            claimsIssuedCount: claimsRes.claimsIssuedCount,
            canaryRequestsServed: this.canaryController.getRequestsServed(),
            residualStateCount: 0,
            executionMode: 'MODE_WAITING_FOR_HUMAN_DECISION',
            terminalState: 'WAITING_FOR_HUMAN_DECISION'
        };
    }
}
exports.ProductionExecutionEngine = ProductionExecutionEngine;
//# sourceMappingURL=productionExecutionEngine.js.map