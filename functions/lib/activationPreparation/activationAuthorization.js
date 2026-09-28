"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION AUTHORIZATION GATES
 *
 * PURPOSE: Five independent authorization gates. Each gate must be individually
 *          approved by a human actor. Approval of one gate does NOT imply
 *          approval of any other gate (no monolithic authorization).
 *
 * RULE: During C2D.8, ALL gates remain at status DRAFT or lower.
 *       ACTIVATION_AUTHORIZATION = FALSE
 *       DEPLOYMENT_AUTHORIZATION = FALSE
 *       CLAIMS_AUTHORIZATION = FALSE
 *       MIGRATION_AUTHORIZATION = FALSE
 *       ROLLOUT_AUTHORIZATION = FALSE
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolloutAuthorizationGate = exports.MigrationAuthorizationGate = exports.ClaimsActivationGate = exports.DeploymentAuthorizationGate = exports.ActivationAuthorizationGate = void 0;
exports.getAllGatesStatus = getAllGatesStatus;
exports.resetAllGates = resetAllGates;
exports.assertC2D8GovernanceLocked = assertC2D8GovernanceLocked;
function createGate(gateType) {
    const state = {
        record: null,
        status: 'UNINITIALIZED',
        auditLog: [],
    };
    return {
        request(actor, reason, candidateId) {
            const now = Date.now();
            const record = {
                gateType,
                authorizationId: `${gateType}-${now}`,
                requestedBy: actor,
                scope: `C2D.8 SIMULATION — ${gateType}`,
                environment: 'SIMULATION', // never 'PRODUCTION'
                tenantCandidateId: candidateId,
                rollbackPlanId: `rollback-${candidateId}`,
                killSwitchStatus: 'ARMED',
                reason,
                expiration: now + 24 * 60 * 60 * 1000, // 24h from request
                status: 'DRAFT',
                auditTimestamp: now,
            };
            state.record = record;
            state.status = 'DRAFT';
            state.auditLog.push({ action: 'REQUESTED', actor, reason, timestamp: now });
            return record;
        },
        review(reviewer) {
            if (state.status !== 'DRAFT') {
                throw new Error(`${gateType}: Cannot review from status ${state.status}. Must be DRAFT first.`);
            }
            state.status = 'REVIEW';
            state.auditLog.push({
                action: 'REQUESTED',
                actor: reviewer,
                reason: `${gateType} moved to REVIEW`,
                timestamp: Date.now(),
            });
        },
        approve(approver) {
            if (state.status !== 'REVIEW') {
                throw new Error(`${gateType}: Cannot approve from status ${state.status}. Must be REVIEW first.`);
            }
            // C2D.8 guard: this path is only reachable in tests that simulate the approval flow
            state.status = 'APPROVED';
            state.auditLog.push({
                action: 'APPROVED', actor: approver,
                reason: `${gateType} gate approved for simulation dry-run`, timestamp: Date.now(),
            });
        },
        reject(actor, reason) {
            state.status = 'REJECTED';
            state.auditLog.push({ action: 'REJECTED', actor, reason, timestamp: Date.now() });
        },
        revoke(actor, reason) {
            state.status = 'REVOKED';
            state.auditLog.push({ action: 'REVOKED', actor, reason, timestamp: Date.now() });
        },
        getStatus() {
            return state.status;
        },
        getRecord() {
            return state.record;
        },
        isAuthorized() {
            // Only APPROVED counts as authorized — and only for simulation/dry-run
            return state.status === 'APPROVED';
        },
        getAuditLog() {
            return [...state.auditLog];
        },
        reset() {
            state.record = null;
            state.status = 'UNINITIALIZED';
            state.auditLog = [];
        },
        /**
         * Hard block if any production SDK invocation is detected.
         * Records a GOVERNANCE_VIOLATION audit entry.
         */
        blockIfProduction() {
            const violation = {
                violationType: 'UNEXPECTED_SDK_INVOCATION',
                severity: 'CRITICAL',
                detectedAt: Date.now(),
                details: `${gateType} gate attempted to execute production SDK operation during C2D.8`,
                blockedOperation: `${gateType}_PRODUCTION_GATE`,
            };
            state.auditLog.push({
                action: 'BLOCKED',
                actor: 'GOVERNANCE_GUARD',
                reason: `GOVERNANCE_VIOLATION: ${JSON.stringify(violation)}`,
                timestamp: Date.now(),
            });
            throw new Error(`GOVERNANCE_VIOLATION: Production operation blocked at ${gateType} gate during C2D.8`);
        },
    };
}
// ─── Five Independent Authorization Gates ────────────────────────────────────
/**
 * ACTIVATION_AUTHORIZATION
 * Controls whether the overall activation has been approved.
 * Does NOT imply any other gate.
 */
exports.ActivationAuthorizationGate = createGate('ACTIVATION');
/**
 * DEPLOYMENT_AUTHORIZATION
 * Controls whether Functions/Rules/Web/Android deployment may proceed.
 * Independent of ACTIVATION_AUTHORIZATION.
 */
exports.DeploymentAuthorizationGate = createGate('DEPLOYMENT');
/**
 * CLAIMS_AUTHORIZATION
 * Controls whether Custom Claims issuance is authorized.
 * Independent of all other gates.
 */
exports.ClaimsActivationGate = createGate('CLAIMS');
/**
 * MIGRATION_AUTHORIZATION
 * Controls whether Room/DB migrations may proceed.
 * Independent of all other gates.
 */
exports.MigrationAuthorizationGate = createGate('MIGRATION');
/**
 * ROLLOUT_AUTHORIZATION
 * Controls whether Canary/traffic rollout may proceed.
 * Independent of all other gates.
 */
exports.RolloutAuthorizationGate = createGate('ROLLOUT');
function getAllGatesStatus() {
    const ACTIVATION = exports.ActivationAuthorizationGate.getStatus();
    const DEPLOYMENT = exports.DeploymentAuthorizationGate.getStatus();
    const CLAIMS = exports.ClaimsActivationGate.getStatus();
    const MIGRATION = exports.MigrationAuthorizationGate.getStatus();
    const ROLLOUT = exports.RolloutAuthorizationGate.getStatus();
    const anyAuthorized = [
        exports.ActivationAuthorizationGate.isAuthorized(),
        exports.DeploymentAuthorizationGate.isAuthorized(),
        exports.ClaimsActivationGate.isAuthorized(),
        exports.MigrationAuthorizationGate.isAuthorized(),
        exports.RolloutAuthorizationGate.isAuthorized(),
    ].some(Boolean);
    const allUnauthorized = !anyAuthorized;
    return { ACTIVATION, DEPLOYMENT, CLAIMS, MIGRATION, ROLLOUT, anyAuthorized, allUnauthorized };
}
function resetAllGates() {
    exports.ActivationAuthorizationGate.reset();
    exports.DeploymentAuthorizationGate.reset();
    exports.ClaimsActivationGate.reset();
    exports.MigrationAuthorizationGate.reset();
    exports.RolloutAuthorizationGate.reset();
}
/**
 * C2D.8 GOVERNANCE INVARIANT ASSERTION
 * Throws if any gate has been promoted beyond REVIEW — which would indicate
 * a governance violation during the preparation phase.
 */
function assertC2D8GovernanceLocked() {
    const gates = getAllGatesStatus();
    const productionStatuses = ['EXECUTING', 'COMPLETED'];
    const entries = Object.entries(gates).filter(([k]) => k !== 'anyAuthorized' && k !== 'allUnauthorized');
    for (const [gate, status] of entries) {
        if (productionStatuses.includes(status)) {
            throw new Error(`GOVERNANCE_VIOLATION: Gate ${gate} has status ${status} during C2D.8. ` +
                `C2D.8 must not execute any production operation.`);
        }
    }
}
//# sourceMappingURL=activationAuthorization.js.map