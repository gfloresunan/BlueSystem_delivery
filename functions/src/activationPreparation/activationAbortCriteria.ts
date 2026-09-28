/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION ABORT CRITERIA EVALUATOR
 *
 * PURPOSE: 16 automatic abort conditions that immediately halt any preparation
 *          or dry-run activation. Never "continue anyway" on a critical breach.
 *
 * GOVERNANCE: Triggered condition → ABORT / ROLLBACK / ESCALATE + GovernanceViolation
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
  AbortConditionType,
  AbortDecision,
  AbortResult,
  GovernanceViolation,
} from './activationModels';

export interface AbortEvaluationSignals {
  crossTenantAnomalyDetected?: boolean;
  claimMismatchDetected?: boolean;
  unexpectedFirestoreMutationCount?: number;
  unexpectedAuthMutationCount?: number;
  rulesDriftDetected?: boolean;
  configurationDriftDetected?: boolean;
  entitlementMismatchDetected?: boolean;
  subscriptionMismatchDetected?: boolean;
  brandMismatchDetected?: boolean;
  quotaInconsistencyDetected?: boolean;
  duplicateProvisioningDetected?: boolean;
  idempotencyConflictDetected?: boolean;
  unexpectedSdkInvocationCount?: number;
  observabilityFailureDetected?: boolean;
  rollbackFailureDetected?: boolean;
  securityTestFailureCount?: number;
}

export class ActivationAbortCriteria {
  /**
   * Evaluates incoming execution signals against all 16 abort conditions.
   */
  static evaluate(signals: AbortEvaluationSignals): AbortResult {
    const conditions: AbortConditionType[] = [];
    const now = Date.now();

    if (signals.crossTenantAnomalyDetected) {
      conditions.push('CROSS_TENANT_ANOMALY');
    }
    if (signals.claimMismatchDetected) {
      conditions.push('CLAIM_MISMATCH');
    }
    if ((signals.unexpectedFirestoreMutationCount ?? 0) > 0) {
      conditions.push('UNEXPECTED_FIRESTORE_MUTATION');
    }
    if ((signals.unexpectedAuthMutationCount ?? 0) > 0) {
      conditions.push('UNEXPECTED_AUTH_MUTATION');
    }
    if (signals.rulesDriftDetected) {
      conditions.push('RULES_DRIFT');
    }
    if (signals.configurationDriftDetected) {
      conditions.push('CONFIGURATION_DRIFT');
    }
    if (signals.entitlementMismatchDetected) {
      conditions.push('ENTITLEMENT_MISMATCH');
    }
    if (signals.subscriptionMismatchDetected) {
      conditions.push('SUBSCRIPTION_MISMATCH');
    }
    if (signals.brandMismatchDetected) {
      conditions.push('BRAND_MISMATCH');
    }
    if (signals.quotaInconsistencyDetected) {
      conditions.push('QUOTA_INCONSISTENCY');
    }
    if (signals.duplicateProvisioningDetected) {
      conditions.push('DUPLICATE_PROVISIONING');
    }
    if (signals.idempotencyConflictDetected) {
      conditions.push('IDEMPOTENCY_CONFLICT');
    }
    if ((signals.unexpectedSdkInvocationCount ?? 0) > 0) {
      conditions.push('UNEXPECTED_SDK_INVOCATION');
    }
    if (signals.observabilityFailureDetected) {
      conditions.push('OBSERVABILITY_FAILURE');
    }
    if (signals.rollbackFailureDetected) {
      conditions.push('ROLLBACK_FAILURE');
    }
    if ((signals.securityTestFailureCount ?? 0) > 0) {
      conditions.push('SECURITY_TEST_FAILURE');
    }

    if (conditions.length === 0) {
      return {
        triggered: false,
        conditions: [],
        decision: 'NO_ABORT',
      };
    }

    // Determine decision severity
    const criticalConditions: AbortConditionType[] = [
      'CROSS_TENANT_ANOMALY',
      'UNEXPECTED_FIRESTORE_MUTATION',
      'UNEXPECTED_AUTH_MUTATION',
      'UNEXPECTED_SDK_INVOCATION',
      'ROLLBACK_FAILURE',
      'SECURITY_TEST_FAILURE',
      'RULES_DRIFT',
    ];

    const hasCritical = conditions.some(c => criticalConditions.includes(c));
    const decision: AbortDecision = hasCritical ? 'ABORT' : (conditions.includes('IDEMPOTENCY_CONFLICT') ? 'ROLLBACK' : 'ESCALATE');

    const violation: GovernanceViolation = {
      violationType: conditions[0],
      severity: hasCritical ? 'CRITICAL' : 'HIGH',
      detectedAt: now,
      details: `Abort triggered by ${conditions.length} condition(s): ${conditions.join(', ')}`,
      blockedOperation: 'CONTROLLED_ACTIVATION_PROCESS',
    };

    return {
      triggered: true,
      conditions,
      decision,
      governanceViolation: violation,
    };
  }
}
