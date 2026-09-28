/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PHASE 2D.9 — FIRST CONTROLLED CANARY ACTIVATION
 * CANONICAL TYPE CONTRACTS & SCHEMAS
 *
 * GOVERNANCE PRINCIPLE:
 * CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION ≠ ROLLOUT
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { CommercialModel, PlanTier, CapabilityModule } from '../domain/platform/models';
import type { EiamRole } from '../domain/identity/models';
import type { ActivationWindow } from '../activationPreparation/activationModels';

// ─── 1. HUMAN CANARY AUTHORIZATION CONTRACT ──────────────────────────────────

export interface HumanCanaryAuthorization {
  readonly authorizationId: string;
  readonly authorizedBy: string;
  readonly authorizationTimestamp: number;
  readonly tenantId: string;
  readonly brandId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly subscriptionPlan: PlanTier;
  readonly approvedScope: string[];
  readonly excludedScope: string[];
  readonly canaryPercentage: number;
  readonly canaryRequestLimit: number;
  readonly activationWindow: ActivationWindow;
  readonly rollbackDeadline: number;
  readonly abortCriteriaVersion: string;
  readonly successCriteriaVersion: string;
  readonly claimsAuthorized: boolean;
  readonly deploymentAuthorized: boolean;
  readonly migrationAuthorized: boolean;
  readonly rolloutAuthorized: boolean;
}

// ─── 2. FIRST CANARY CANDIDATE (SINGLE TENANT) ───────────────────────────────

export interface FirstCanaryCandidate {
  readonly candidateId: string;
  readonly tenantId: string;
  readonly brandId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly commercialModel: CommercialModel;
  readonly subscriptionPlan: PlanTier;
  readonly entitlements: CapabilityModule[];
  readonly initialRole: EiamRole;
  readonly canary: true;
  readonly canaryPercentage: number; // 0 or minimum allowed (e.g. 0.01 / 1 request limit)
  readonly canaryRequestLimit: 1;    // strictly 1 for first canary
  readonly simulationOnly: false;
  readonly humanAuthorizationRequired: true;
  readonly rolloutAllowed: false;    // strictly false in C2D.9
}

// ─── 3. CANARY TRAFFIC CONTEXT ───────────────────────────────────────────────

export type CanaryTrafficType = 'CANARY_TRAFFIC' | 'LEGACY_TRAFFIC';

export interface CanaryTrafficContext {
  readonly canaryActivationId: string;
  readonly tenantId: string;
  readonly requestId: string;
  readonly timestamp: number;
  readonly environment: 'LOCAL' | 'TEST' | 'SIMULATION' | 'CANARY_CONTROLLED';
  readonly scope: string;
  readonly trafficType: CanaryTrafficType;
}

// ─── 4. CANARY OBSERVABILITY EVENT TYPES (16 CANONICAL EVENTS) ───────────────

export type CanaryObservabilityEventType =
  | 'ACTIVATION_AUTHORIZED'
  | 'ACTIVATION_PREFLIGHT_STARTED'
  | 'ACTIVATION_PREFLIGHT_PASSED'
  | 'ACTIVATION_STARTED'
  | 'CANARY_ENABLED'
  | 'CANARY_REQUEST_ACCEPTED'
  | 'PROVISIONING_STARTED'
  | 'PROVISIONING_COMPLETED'
  | 'GATEKEEPER_DECISION'
  | 'ENTITLEMENT_DECISION'
  | 'CLIENT_EXPERIENCE_RESOLVED'
  | 'SECURITY_CHECK'
  | 'ACTIVATION_ABORTED'
  | 'ROLLBACK_STARTED'
  | 'ROLLBACK_COMPLETED'
  | 'ACTIVATION_COMPLETED';

export interface CanaryObservabilityEvent {
  readonly eventId: string;
  readonly type: CanaryObservabilityEventType;
  readonly tenantId?: string;
  readonly brandId?: string;
  readonly candidateId?: string;
  readonly requestId?: string;
  readonly module?: string;
  readonly role?: string;
  readonly decision?: string;
  readonly reason: string;
  readonly timestamp: number;
}

// ─── 5. AUTOMATIC ABORT CRITERIA (17 TRIGGERS) ───────────────────────────────

export type CanaryAbortConditionType =
  | 'TENANT_MISMATCH'
  | 'BRAND_MISMATCH'
  | 'SUBSCRIPTION_MISMATCH'
  | 'ENTITLEMENT_MISMATCH'
  | 'ROLE_ESCALATION'
  | 'QUOTA_INCONSISTENCY'
  | 'UNEXPECTED_FIRESTORE_MUTATION'
  | 'UNEXPECTED_AUTH_MUTATION'
  | 'UNAUTHORIZED_CLAIMS'
  | 'RULES_DRIFT'
  | 'CONFIGURATION_DRIFT'
  | 'DUPLICATE_PROVISIONING'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNEXPECTED_PRODUCTION_SDK'
  | 'OBSERVABILITY_FAILURE'
  | 'ROLLBACK_FAILURE'
  | 'KILL_SWITCH_FAILURE';

export interface CanaryAbortResult {
  readonly triggered: boolean;
  readonly conditions: CanaryAbortConditionType[];
  readonly decision: 'ABORT' | 'ROLLBACK' | 'NO_ABORT';
  readonly details?: string;
  readonly timestamp: number;
}

// ─── 6. CANARY SUCCESS CRITERIA ──────────────────────────────────────────────

export type CanarySuccessCriterionId =
  | 'TENANT_IDENTITY'
  | 'BRAND_IDENTITY'
  | 'BUSINESS_IDENTITY'
  | 'BRANCH_IDENTITY'
  | 'SUBSCRIPTION'
  | 'ENTITLEMENTS'
  | 'MEMBERSHIP'
  | 'GATEKEEPER'
  | 'QUOTA'
  | 'WEB_HYDRATION'
  | 'ANDROID_HYDRATION'
  | 'NAVIGATION'
  | 'SECURITY'
  | 'OBSERVABILITY'
  | 'KILL_SWITCH_ARMED'
  | 'ROLLBACK_READY'
  | 'CLIENT_PARITY';

export interface CanarySuccessReport {
  readonly reportId: string;
  readonly allPassed: boolean;
  readonly criteria: Array<{ id: CanarySuccessCriterionId; passed: boolean; evidence: string }>;
  readonly crossTenantLeakageCount: 0;
  readonly privilegeEscalationCount: 0;
  readonly unexpectedSdkInvocations: 0;
  readonly unauthorizedMutations: 0;
  readonly configurationDriftCount: 0;
  readonly securityViolationsCount: 0;
  readonly timestamp: number;
}

// ─── 7. GOVERNANCE STATE MACHINE & SCORECARD ────────────────────────────────

export type CanaryGovernanceStage =
  | 'AUTHORIZED'
  | 'PREFLIGHT'
  | 'CANARY_READY'
  | 'CANARY_ACTIVE'
  | 'OBSERVING'
  | 'SUCCESS'
  | 'ABORTED'
  | 'HUMAN_REVIEW'
  | 'WAITING_FOR_HUMAN_DECISION'
  | 'MANDATORY_STOP';

export interface CanaryExecutionResult {
  readonly executionId: string;
  readonly candidateId: string;
  readonly stage: CanaryGovernanceStage;
  readonly success: boolean;
  readonly canaryRequestsServed: number;
  readonly canaryRequestLimit: 1;
  readonly webValidated: boolean;
  readonly androidValidated: boolean;
  readonly rollbackStatus: 'READY' | 'EXECUTED' | 'NOT_NEEDED';
  readonly residualStateCount: 0;
  readonly waitingForHumanDecision: true;
  readonly timestamp: number;
}

export interface CanaryScorecard {
  humanAuthorization: 'PASS' | 'FAIL';
  scopeValidation: 'PASS' | 'FAIL';
  finalPreflight: 'PASS' | 'FAIL';
  rulesValidation: 'PASS' | 'FAIL';
  claimsGate: 'PASS' | 'FAIL';
  provisioningValidation: 'PASS' | 'FAIL';
  killSwitch: 'PASS' | 'FAIL';
  canaryExecution: 'PASS' | 'FAIL';
  observability: 'PASS' | 'FAIL';
  webValidation: 'PASS' | 'FAIL';
  androidValidation: 'PASS' | 'FAIL';
  securityMatrix: 'PASS' | 'FAIL';
  regression: 'PASS' | 'FAIL';
  rollbackReadiness: 'PASS' | 'FAIL';
  crossTenantLeakage: 0;
  privilegeEscalation: 0;
  unauthorizedMutation: 0;
  unexpectedSdkInvocation: 0;
  configurationDrift: 0;
}
