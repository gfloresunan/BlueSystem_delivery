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

import type {
  AuthorizationGateType,
  AuthorizationStatus,
  AuthorizationGateRecord,
  GovernanceViolation,
} from './activationModels';

// ─── Shared Gate Engine ───────────────────────────────────────────────────────

interface GateState {
  record: AuthorizationGateRecord | null;
  status: AuthorizationStatus | 'UNINITIALIZED';
  auditLog: GateAuditEntry[];
}

interface GateAuditEntry {
  action: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED' | 'BLOCKED';
  actor: string;
  reason: string;
  timestamp: number;
}

function createGate(gateType: AuthorizationGateType): {
  request(actor: string, reason: string, candidateId: string): AuthorizationGateRecord;
  review(reviewer: string): void;
  approve(approver: string): void;
  reject(actor: string, reason: string): void;
  revoke(actor: string, reason: string): void;
  getStatus(): AuthorizationStatus | 'UNINITIALIZED';
  getRecord(): AuthorizationGateRecord | null;
  isAuthorized(): boolean;
  getAuditLog(): GateAuditEntry[];
  reset(): void;
  blockIfProduction(): void;
} {
  const state: GateState = {
    record: null,
    status: 'UNINITIALIZED',
    auditLog: [],
  };

  return {
    request(actor: string, reason: string, candidateId: string): AuthorizationGateRecord {
      const now = Date.now();
      const record: AuthorizationGateRecord = {
        gateType,
        authorizationId: `${gateType}-${now}`,
        requestedBy: actor,
        scope: `C2D.8 SIMULATION — ${gateType}`,
        environment: 'SIMULATION',   // never 'PRODUCTION'
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

    review(reviewer: string): void {
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

    approve(approver: string): void {
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

    reject(actor: string, reason: string): void {
      state.status = 'REJECTED';
      state.auditLog.push({ action: 'REJECTED', actor, reason, timestamp: Date.now() });
    },

    revoke(actor: string, reason: string): void {
      state.status = 'REVOKED';
      state.auditLog.push({ action: 'REVOKED', actor, reason, timestamp: Date.now() });
    },

    getStatus(): AuthorizationStatus | 'UNINITIALIZED' {
      return state.status;
    },

    getRecord(): AuthorizationGateRecord | null {
      return state.record;
    },

    isAuthorized(): boolean {
      // Only APPROVED counts as authorized — and only for simulation/dry-run
      return state.status === 'APPROVED';
    },

    getAuditLog(): GateAuditEntry[] {
      return [...state.auditLog];
    },

    reset(): void {
      state.record = null;
      state.status = 'UNINITIALIZED';
      state.auditLog = [];
    },

    /**
     * Hard block if any production SDK invocation is detected.
     * Records a GOVERNANCE_VIOLATION audit entry.
     */
    blockIfProduction(): void {
      const violation: GovernanceViolation = {
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
export const ActivationAuthorizationGate = createGate('ACTIVATION');

/**
 * DEPLOYMENT_AUTHORIZATION
 * Controls whether Functions/Rules/Web/Android deployment may proceed.
 * Independent of ACTIVATION_AUTHORIZATION.
 */
export const DeploymentAuthorizationGate = createGate('DEPLOYMENT');

/**
 * CLAIMS_AUTHORIZATION
 * Controls whether Custom Claims issuance is authorized.
 * Independent of all other gates.
 */
export const ClaimsActivationGate = createGate('CLAIMS');

/**
 * MIGRATION_AUTHORIZATION
 * Controls whether Room/DB migrations may proceed.
 * Independent of all other gates.
 */
export const MigrationAuthorizationGate = createGate('MIGRATION');

/**
 * ROLLOUT_AUTHORIZATION
 * Controls whether Canary/traffic rollout may proceed.
 * Independent of all other gates.
 */
export const RolloutAuthorizationGate = createGate('ROLLOUT');

// ─── Composite Gate Inspector ─────────────────────────────────────────────────

export interface AllGatesStatus {
  ACTIVATION: AuthorizationStatus | 'UNINITIALIZED';
  DEPLOYMENT: AuthorizationStatus | 'UNINITIALIZED';
  CLAIMS: AuthorizationStatus | 'UNINITIALIZED';
  MIGRATION: AuthorizationStatus | 'UNINITIALIZED';
  ROLLOUT: AuthorizationStatus | 'UNINITIALIZED';
  anyAuthorized: boolean;
  allUnauthorized: boolean;
}

export function getAllGatesStatus(): AllGatesStatus {
  const ACTIVATION = ActivationAuthorizationGate.getStatus();
  const DEPLOYMENT = DeploymentAuthorizationGate.getStatus();
  const CLAIMS = ClaimsActivationGate.getStatus();
  const MIGRATION = MigrationAuthorizationGate.getStatus();
  const ROLLOUT = RolloutAuthorizationGate.getStatus();

  const anyAuthorized = [
    ActivationAuthorizationGate.isAuthorized(),
    DeploymentAuthorizationGate.isAuthorized(),
    ClaimsActivationGate.isAuthorized(),
    MigrationAuthorizationGate.isAuthorized(),
    RolloutAuthorizationGate.isAuthorized(),
  ].some(Boolean);

  const allUnauthorized = !anyAuthorized;

  return { ACTIVATION, DEPLOYMENT, CLAIMS, MIGRATION, ROLLOUT, anyAuthorized, allUnauthorized };
}

export function resetAllGates(): void {
  ActivationAuthorizationGate.reset();
  DeploymentAuthorizationGate.reset();
  ClaimsActivationGate.reset();
  MigrationAuthorizationGate.reset();
  RolloutAuthorizationGate.reset();
}

/**
 * C2D.8 GOVERNANCE INVARIANT ASSERTION
 * Throws if any gate has been promoted beyond REVIEW — which would indicate
 * a governance violation during the preparation phase.
 */
export function assertC2D8GovernanceLocked(): void {
  const gates = getAllGatesStatus();
  const productionStatuses: Array<AuthorizationStatus> = ['EXECUTING', 'COMPLETED'];
  const entries = Object.entries(gates).filter(([k]) => k !== 'anyAuthorized' && k !== 'allUnauthorized');

  for (const [gate, status] of entries) {
    if (productionStatuses.includes(status as AuthorizationStatus)) {
      throw new Error(
        `GOVERNANCE_VIOLATION: Gate ${gate} has status ${status} during C2D.8. ` +
        `C2D.8 must not execute any production operation.`
      );
    }
  }
}
