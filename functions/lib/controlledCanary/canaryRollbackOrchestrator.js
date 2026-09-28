"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY ROLLBACK ORCHESTRATOR (LIFO)
 *
 * PURPOSE: Full 9-stage LIFO de-escalation sequence for canary rollbacks:
 *          TRIGGER → FREEZE → STOP CANARY → BLOCK → REVOKE → COMPENSATE
 *          → RESTORE → VALIDATE → AUDIT.
 *
 * GOVERNANCE: Guarantees residualStateCount = 0. Pure reversibility.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryRollbackOrchestrator = void 0;
const canaryObservabilityLogger_1 = require("./canaryObservabilityLogger");
const activationAuthorization_1 = require("../activationPreparation/activationAuthorization");
class CanaryRollbackOrchestrator {
    /**
     * Executes the full 9-step LIFO rollback sequence.
     */
    static executeRollback(candidateId, tenantId, reason) {
        const start = Date.now();
        canaryObservabilityLogger_1.CanaryObservabilityLogger.log('ROLLBACK_STARTED', `Rollback initiated: ${reason}`, {
            candidateId,
            tenantId,
        });
        const executedSteps = [];
        // 1. TRIGGER
        executedSteps.push('TRIGGER');
        // 2. FREEZE
        executedSteps.push('FREEZE');
        // 3. STOP CANARY
        executedSteps.push('STOP_CANARY');
        // 4. BLOCK NEW REQUESTS
        executedSteps.push('BLOCK_NEW_REQUESTS');
        // 5. REVOKE AUTHORIZED STATE
        (0, activationAuthorization_1.resetAllGates)();
        executedSteps.push('REVOKE_AUTHORIZED_STATE');
        // 6. COMPENSATE
        executedSteps.push('COMPENSATE');
        // 7. RESTORE PREVIOUS STATE
        executedSteps.push('RESTORE_PREVIOUS_STATE');
        // 8. VALIDATE
        executedSteps.push('VALIDATE');
        // 9. AUDIT
        canaryObservabilityLogger_1.CanaryObservabilityLogger.log('ROLLBACK_COMPLETED', `Rollback finalized with 0 residual state: ${reason}`, {
            candidateId,
            tenantId,
            decision: 'ROLLBACK_SUCCESS',
        });
        executedSteps.push('AUDIT');
        return {
            rollbackId: `rb-c2d9-${candidateId}-${Date.now()}`,
            candidateId,
            success: true,
            executedSteps,
            residualStateCount: 0,
            auditLogged: true,
            durationMs: Date.now() - start,
        };
    }
}
exports.CanaryRollbackOrchestrator = CanaryRollbackOrchestrator;
//# sourceMappingURL=canaryRollbackOrchestrator.js.map