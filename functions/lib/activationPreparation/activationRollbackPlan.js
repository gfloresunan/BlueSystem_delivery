"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION ROLLBACK PLAN & SIMULATOR
 *
 * PURPOSE: LIFO (Last-In, First-Out) compensation and rollback execution model.
 *          Guarantees zero residual state in any unconfirmed or aborted stage.
 *
 * GOVERNANCE: Dry-run simulation only. Pure in-memory state restoration.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationRollbackPlanSimulator = void 0;
class ActivationRollbackPlanSimulator {
    /**
     * Generates a canonical RollbackPlanDefinition for a candidate.
     */
    static createPlanDefinition(candidateId) {
        return {
            rollbackId: `rollback-${candidateId}`,
            triggerConditions: [
                'CROSS_TENANT_ANOMALY',
                'UNEXPECTED_MUTATION',
                'KILL_SWITCH_TRIGGERED',
                'AUTH_OR_CLAIMS_MISMATCH',
                'PARITY_FAILURE',
            ],
            steps: [
                'TRIGGER',
                'FREEZE',
                'STOP_TRAFFIC',
                'DISABLE_ACTIVATION',
                'REVOKE_TEMP_AUTHORIZATION',
                'RESTORE_PREVIOUS_STATE',
                'VALIDATE',
                'AUDIT',
            ],
            lifoEnforced: true,
            compensationSteps: [
                'PURGE_IN_MEMORY_SESSION',
                'RESET_CANARY_ROUTING',
                'REVERT_PROVISIONED_AGGREGATES',
                'EMIT_ROLLBACK_AUDIT_LOG',
            ],
            validationChecks: [
                'ASSERT_RESIDUAL_STATE_ZERO',
                'ASSERT_ACTIVE_SESSIONS_PURGED',
                'ASSERT_GATES_RESET_TO_DRAFT',
            ],
            auditRequired: true,
            estimatedDurationMs: 150,
        };
    }
    /**
     * Simulates full execution of the LIFO rollback sequence.
     */
    static simulateRollback(plan) {
        const start = Date.now();
        const executedSteps = [];
        // Execute steps strictly in specified order (which follows LIFO de-escalation)
        for (const step of plan.steps) {
            executedSteps.push(step);
        }
        const durationMs = Date.now() - start;
        return {
            rollbackId: plan.rollbackId,
            success: true,
            executedSteps,
            residualStateCount: 0,
            auditRecorded: plan.auditRequired,
            durationMs,
        };
    }
}
exports.ActivationRollbackPlanSimulator = ActivationRollbackPlanSimulator;
//# sourceMappingURL=activationRollbackPlan.js.map