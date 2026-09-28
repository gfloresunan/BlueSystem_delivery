/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PHASE 2D.8 — CONTROLLED ACTIVATION PREPARATION
 * CHECKPOINT #1 — CANONICAL TYPE CONTRACTS
 *
 * PURPOSE: All type definitions for the Controlled Activation Preparation layer.
 *          These contracts are LOCAL-ONLY / SIMULATION-ONLY. None of these
 *          types represent or authorize production entities.
 *
 * GOVERNANCE: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION
 * PRODUCTION_MUTATIONS = 0 at all times during C2D.8
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { CommercialModel, PlanTier, CapabilityModule } from '../domain/platform/models';
import type { EiamRole } from '../domain/identity/models';

// ─── 1. FIRST ACTIVATION CANDIDATE (LOCAL FIXTURE ONLY) ──────────────────────

/**
 * Simulation-only fixture representing the first tenant that COULD be activated
 * in a future controlled activation. MUST NOT EXIST IN PRODUCTION.
 */
export interface FirstActivationCandidate {
  readonly candidateId: string;
  readonly tenantId: string;               // simulation ID only
  readonly brandId: string;               // simulation ID only
  readonly businessId: string;            // simulation ID only
  readonly branchId: string;              // simulation ID only
  readonly commercialModel: CommercialModel;
  readonly subscriptionPlan: PlanTier;
  readonly entitlements: CapabilityModule[];
  readonly initialRole: EiamRole;
  readonly activationScope: ActivationScopeDefinition;
  readonly expectedModules: CapabilityModule[];
  readonly expectedQuotaLimits: Record<string, number>;
  readonly rollbackScope: RollbackScopeDefinition;
  readonly simulationOnly: true;          // compile-time guard — always true
  readonly mustNotExistInProduction: true; // compile-time guard — always true
}

// ─── 2. ACTIVATION SCOPE ─────────────────────────────────────────────────────

export interface ActivationScopeDefinition {
  included: ActivationIncludedItem[];
  explicitlyExcluded: ActivationExcludedItem[];
  minimumViableScope: boolean;
}

export type ActivationIncludedItem =
  | 'CORE_BACKEND'
  | 'TENANT'
  | 'BRAND'
  | 'BUSINESS'
  | 'BRANCH'
  | 'SUBSCRIPTION'
  | 'ENTITLEMENTS'
  | 'MEMBERSHIP'
  | 'GATEKEEPER'
  | 'WEB_EXPERIENCE'
  | 'ANDROID_EXPERIENCE'
  | 'INITIAL_CONFIGURATION';

export type ActivationExcludedItem =
  | 'ADDITIONAL_TENANTS'
  | 'ADDITIONAL_BRANDS'
  | 'ADDITIONAL_USERS'
  | 'BULK_PROVISIONING'
  | 'MIGRATION'
  | 'MASS_CLAIMS_ROLLOUT'
  | 'GENERAL_CANARY'
  | 'MARKETPLACE_WIDE_ACTIVATION';

export interface RollbackScopeDefinition {
  steps: RollbackStep[];
  lifoOrder: boolean;     // always true — LIFO required
  residualStateZero: boolean;
}

export type RollbackStep =
  | 'TRIGGER'
  | 'FREEZE'
  | 'STOP_TRAFFIC'
  | 'DISABLE_ACTIVATION'
  | 'REVOKE_TEMP_AUTHORIZATION'
  | 'RESTORE_PREVIOUS_STATE'
  | 'VALIDATE'
  | 'AUDIT';

// ─── 3. AUTHORIZATION GATES ──────────────────────────────────────────────────

export type AuthorizationGateType =
  | 'ACTIVATION'
  | 'DEPLOYMENT'
  | 'CLAIMS'
  | 'MIGRATION'
  | 'ROLLOUT';

export type AuthorizationStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ABORTED'
  | 'REVOKED'
  | 'EXPIRED';

export interface AuthorizationGateRecord {
  readonly gateType: AuthorizationGateType;
  readonly authorizationId: string;
  readonly requestedBy: string;
  readonly approvedBy?: string;
  readonly scope: string;
  readonly environment: 'LOCAL' | 'TEST' | 'SIMULATION'; // NEVER 'PRODUCTION'
  readonly tenantCandidateId: string;
  readonly plannedWindowStart?: number;
  readonly plannedWindowEnd?: number;
  readonly rollbackPlanId: string;
  readonly killSwitchStatus: 'ARMED';   // always ARMED during C2D.8
  readonly reason: string;
  readonly expiration: number;
  readonly status: AuthorizationStatus;
  readonly auditTimestamp: number;
}

// ─── 4. ACTIVATION AUTHORIZATION MODEL ───────────────────────────────────────

/**
 * Full activation authorization — requires ALL 5 gates to be individually approved.
 * No gate approval implies any other gate approval.
 * During C2D.8, all statuses remain DRAFT or lower.
 */
export interface ActivationAuthorization {
  readonly authorizationId: string;
  readonly requestedBy: string;
  readonly approvedBy?: string;          // undefined during C2D.8
  readonly scope: ActivationScopeDefinition;
  readonly environment: 'LOCAL' | 'TEST' | 'SIMULATION';
  readonly tenantCandidate: FirstActivationCandidate;
  readonly plannedWindow?: ActivationWindow;
  readonly rollbackPlan: RollbackPlanDefinition;
  readonly killSwitchStatus: 'ARMED';
  readonly gates: {
    activationAuthorization: AuthorizationGateRecord;
    deploymentAuthorization: AuthorizationGateRecord;
    claimsAuthorization: AuthorizationGateRecord;
    migrationAuthorization: AuthorizationGateRecord;
    rolloutAuthorization: AuthorizationGateRecord;
  };
  readonly expiration: number;
  readonly status: AuthorizationStatus;
}

// ─── 5. ACTIVATION WINDOW ────────────────────────────────────────────────────

export interface ActivationWindow {
  readonly windowId: string;
  readonly start: number;               // epoch ms
  readonly end: number;                 // epoch ms
  readonly timezone: string;            // e.g. 'America/Mexico_City'
  readonly changeFreeze: boolean;       // no config changes during window
  readonly supportWindow: {
    readonly startOffset: number;       // ms before window start
    readonly endOffset: number;         // ms after window end
  };
  readonly rollbackDeadline: number;    // epoch ms — must be <= end
  readonly observationWindow: {
    readonly durationMs: number;
    readonly healthCheckIntervalMs: number;
  };
}

// ─── 6. ROLLBACK PLAN ────────────────────────────────────────────────────────

export interface RollbackPlanDefinition {
  readonly rollbackId: string;
  readonly triggerConditions: string[];
  readonly steps: RollbackStep[];
  readonly lifoEnforced: true;
  readonly compensationSteps: string[];
  readonly validationChecks: string[];
  readonly auditRequired: true;
  readonly estimatedDurationMs: number;
}

// ─── 7. DRY-RUN RESULT ───────────────────────────────────────────────────────

export type DryRunStatus =
  | 'DRY_RUN_SUCCESS'    // all pipeline stages passed in-memory
  | 'DRY_RUN_PARTIAL'    // some stages succeeded
  | 'DRY_RUN_FAILED'     // pipeline failed
  | 'DRY_RUN_ABORTED';   // aborted by kill switch or abort criteria

export interface DryRunStageResult {
  readonly stage: string;
  readonly status: 'PASS' | 'FAIL' | 'SKIP';
  readonly durationMs: number;
  readonly details?: string;
}

export interface DryRunResult {
  readonly dryRunId: string;
  readonly candidateId: string;
  readonly status: DryRunStatus;
  readonly stages: DryRunStageResult[];
  readonly productionMutations: 0;  // compile-time guarantee
  readonly realUsersExposed: 0;     // compile-time guarantee
  readonly webSnapshotValidated: boolean;
  readonly androidSnapshotValidated: boolean;
  readonly parityVerified: boolean;  // Web ≡ Android
  readonly rollbackSimulated: boolean;
  readonly observabilityVerified: boolean;
  readonly timestamp: number;
}

// ─── 8. PREFLIGHT CHECKLIST ──────────────────────────────────────────────────

export interface PreflightCheckItem {
  readonly id: string;
  readonly description: string;
  readonly critical: boolean;        // if critical and FAIL → overall NO-GO
  readonly status: 'PASS' | 'FAIL' | 'SKIPPED' | 'PENDING';
  readonly evidence?: string;
}

export interface PreflightReport {
  readonly checklistId: string;
  readonly items: PreflightCheckItem[];
  readonly overallStatus: 'PASS' | 'NO-GO';
  readonly criticalFailures: string[];
  readonly timestamp: number;
}

// ─── 9. ABORT CRITERIA ───────────────────────────────────────────────────────

export type AbortConditionType =
  | 'CROSS_TENANT_ANOMALY'
  | 'CLAIM_MISMATCH'
  | 'UNEXPECTED_FIRESTORE_MUTATION'
  | 'UNEXPECTED_AUTH_MUTATION'
  | 'RULES_DRIFT'
  | 'CONFIGURATION_DRIFT'
  | 'ENTITLEMENT_MISMATCH'
  | 'SUBSCRIPTION_MISMATCH'
  | 'BRAND_MISMATCH'
  | 'QUOTA_INCONSISTENCY'
  | 'DUPLICATE_PROVISIONING'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNEXPECTED_SDK_INVOCATION'
  | 'OBSERVABILITY_FAILURE'
  | 'ROLLBACK_FAILURE'
  | 'SECURITY_TEST_FAILURE';

export type AbortDecision = 'ABORT' | 'ROLLBACK' | 'ESCALATE';

export interface AbortResult {
  readonly triggered: boolean;
  readonly conditions: AbortConditionType[];
  readonly decision: AbortDecision | 'NO_ABORT';
  readonly governanceViolation?: GovernanceViolation;
}

export interface GovernanceViolation {
  readonly violationType: AbortConditionType;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  readonly detectedAt: number;
  readonly details: string;
  readonly blockedOperation: string;
}

// ─── 10. SUCCESS CRITERIA ────────────────────────────────────────────────────

export type SuccessCriterionId =
  | 'TENANT_IDENTITY_CORRECT'
  | 'BRAND_IDENTITY_CORRECT'
  | 'SUBSCRIPTION_CORRECT'
  | 'ENTITLEMENTS_CORRECT'
  | 'MEMBERSHIP_CORRECT'
  | 'GATEKEEPER_CORRECT'
  | 'QUOTA_CORRECT'
  | 'WEB_EXPERIENCE_CORRECT'
  | 'ANDROID_EXPERIENCE_CORRECT'
  | 'NO_CROSS_TENANT_LEAKAGE'
  | 'NO_PRIVILEGE_ESCALATION'
  | 'NO_UNEXPECTED_MUTATIONS'
  | 'OBSERVABILITY_COMPLETE'
  | 'ROLLBACK_AVAILABLE'
  | 'KILL_SWITCH_AVAILABLE'
  | 'WEB_ANDROID_PARITY';

export interface SuccessCriterionResult {
  readonly id: SuccessCriterionId;
  readonly passed: boolean;
  readonly evidence: string;
}

export interface SuccessReport {
  readonly reportId: string;
  readonly allPassed: boolean;
  readonly criteria: SuccessCriterionResult[];
  readonly dryRunOnly: true;          // never production
  readonly timestamp: number;
}

// ─── 11. OBSERVABILITY EVENTS ────────────────────────────────────────────────

export type ActivationObservabilityEventType =
  | 'ACTIVATION_PREPARED'
  | 'ACTIVATION_AUTHORIZED'
  | 'ACTIVATION_STARTED'
  | 'ACTIVATION_ABORTED'
  | 'ACTIVATION_COMPLETED'
  | 'KILL_SWITCH_TRIGGERED'
  | 'CLAIMS_BLOCKED'
  | 'PROVISIONING_SIMULATED'
  | 'ROLLBACK_SIMULATED'
  | 'SECURITY_VIOLATION'
  | 'TENANT_MISMATCH'
  | 'ENTITLEMENT_MISMATCH'
  | 'GOVERNANCE_VIOLATION';

export interface ActivationObservabilityEvent {
  readonly eventId: string;
  readonly type: ActivationObservabilityEventType;
  readonly tenantId?: string;
  readonly brandId?: string;
  readonly candidateId?: string;
  readonly module?: string;
  readonly role?: string;
  readonly decision?: string;
  readonly reason: string;
  readonly timestamp: number;
  // Explicitly NO: password, jwt, private_key, api_key, secret, credential
}

// ─── 12. RESPONSIBILITY MATRIX ───────────────────────────────────────────────

export type ResponsibilityActor = string | 'UNDEFINED';  // UNDEFINED = governance gap

export interface ResponsibilityEntry {
  readonly responsibility: string;
  readonly owner: ResponsibilityActor;
  readonly approver: ResponsibilityActor;
  readonly executor: ResponsibilityActor;
  readonly observer: ResponsibilityActor;
}

export interface ActivationResponsibilityMatrix {
  readonly matrixId: string;
  readonly entries: ResponsibilityEntry[];
  readonly governanceGaps: string[];  // entries where any actor is UNDEFINED
  readonly timestamp: number;
}

// ─── 13. CANARY PLAN (SIMULATION ONLY) ───────────────────────────────────────

export interface CanaryPlanDefinition {
  readonly planId: string;
  readonly enabled: false;              // always false during C2D.8
  readonly percentage: 0;              // always 0 during C2D.8
  readonly entryCriteria: string[];
  readonly healthMetrics: string[];
  readonly abortCriteria: string[];
  readonly successCriteria: string[];
  readonly exitCriteria: string[];
  readonly rollbackProcedure: string[];
  readonly simulationOnly: true;
}

// ─── 14. GOVERNANCE DECISION ─────────────────────────────────────────────────

export type GovernanceDecisionOutcome = 'PREPARED' | 'CONDITIONAL_PREPARED' | 'NO_GO';

export interface GovernanceDecisionReport {
  readonly decisionId: string;
  readonly outcome: GovernanceDecisionOutcome;
  readonly phase: 'C2D.8';
  readonly baseline: 'C2D.7';
  readonly activationAuthorizationStatus: 'FALSE';  // always FALSE at C2D.8 end
  readonly deploymentAuthorizationStatus: 'FALSE';
  readonly claimsAuthorizationStatus: 'FALSE';
  readonly migrationAuthorizationStatus: 'FALSE';
  readonly rolloutAuthorizationStatus: 'FALSE';
  readonly killSwitchStatus: 'ARMED';
  readonly canaryEnabled: false;
  readonly productionMutations: 0;
  readonly realUsersExposed: 0;
  readonly conditions?: string[];       // for CONDITIONAL_PREPARED
  readonly blockers?: string[];         // for NO_GO
  readonly mandatoryGovernanceStop: true;
  readonly nextPhaseRequires: 'EXPLICIT_HUMAN_AUTHORIZATION';
  readonly timestamp: number;
}
