/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * HUMAN CANARY AUTHORIZATION & SEPARATED GATES VALIDATOR
 *
 * PURPOSE: Validates the 16 mandatory fields of HumanCanaryAuthorization.
 *          Enforces 5 independent authorization gates:
 *          ACTIVATION_AUTHORIZATION = TRUE (under valid authorization)
 *          DEPLOYMENT_AUTHORIZATION = FALSE
 *          CLAIMS_AUTHORIZATION = FALSE (unless explicitly granted)
 *          MIGRATION_AUTHORIZATION = FALSE
 *          ROLLOUT_AUTHORIZATION = FALSE
 *
 * RULE: Missing parameter → NO-GO (AUTHORIZATION_SCOPE_INCOMPLETE).
 *       Zero automatic inferences or auto-completion.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { HumanCanaryAuthorization } from './canaryModels';
import {
  ActivationAuthorizationGate,
  DeploymentAuthorizationGate,
  ClaimsActivationGate,
  MigrationAuthorizationGate,
  RolloutAuthorizationGate,
  resetAllGates,
} from '../activationPreparation/activationAuthorization';

export interface AuthorizationValidationReport {
  readonly isValid: boolean;
  readonly status: 'PASS' | 'NO-GO';
  readonly missingFields: string[];
  readonly reason?: string;
  readonly authorization?: HumanCanaryAuthorization;
}

export class CanaryAuthorizationValidator {
  /**
   * Validates that all 16 mandatory parameters are explicitly defined and non-empty.
   */
  static validate(auth: Partial<HumanCanaryAuthorization>): AuthorizationValidationReport {
    const missingFields: string[] = [];

    if (!auth.authorizationId || auth.authorizationId.trim().length === 0) {
      missingFields.push('authorizationId');
    }
    if (!auth.authorizedBy || auth.authorizedBy.trim().length === 0) {
      missingFields.push('authorizedBy');
    }
    if (typeof auth.authorizationTimestamp !== 'number' || auth.authorizationTimestamp <= 0) {
      missingFields.push('authorizationTimestamp');
    }
    if (!auth.tenantId || auth.tenantId.trim().length === 0) {
      missingFields.push('tenantId');
    }
    if (!auth.brandId || auth.brandId.trim().length === 0) {
      missingFields.push('brandId');
    }
    if (!auth.businessId || auth.businessId.trim().length === 0) {
      missingFields.push('businessId');
    }
    if (!auth.branchId || auth.branchId.trim().length === 0) {
      missingFields.push('branchId');
    }
    if (!auth.subscriptionPlan || auth.subscriptionPlan.trim().length === 0) {
      missingFields.push('subscriptionPlan');
    }
    if (!auth.approvedScope || !Array.isArray(auth.approvedScope) || auth.approvedScope.length === 0) {
      missingFields.push('approvedScope');
    }
    if (!auth.excludedScope || !Array.isArray(auth.excludedScope) || auth.excludedScope.length === 0) {
      missingFields.push('excludedScope');
    }
    if (typeof auth.canaryPercentage !== 'number' || auth.canaryPercentage < 0 || auth.canaryPercentage > 0.01) {
      missingFields.push('canaryPercentage');
    }
    if (typeof auth.canaryRequestLimit !== 'number' || auth.canaryRequestLimit !== 1) {
      missingFields.push('canaryRequestLimit');
    }
    if (!auth.activationWindow || typeof auth.activationWindow.start !== 'number' || typeof auth.activationWindow.end !== 'number') {
      missingFields.push('activationWindow');
    }
    if (typeof auth.rollbackDeadline !== 'number' || auth.rollbackDeadline <= 0 || auth.rollbackDeadline < Date.now()) {
      missingFields.push('rollbackDeadline');
    }
    if (!auth.abortCriteriaVersion || auth.abortCriteriaVersion.trim().length === 0) {
      missingFields.push('abortCriteriaVersion');
    }
    if (!auth.successCriteriaVersion || auth.successCriteriaVersion.trim().length === 0) {
      missingFields.push('successCriteriaVersion');
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        status: 'NO-GO',
        missingFields,
        reason: `AUTHORIZATION_SCOPE_INCOMPLETE: Missing mandatory parameters [${missingFields.join(', ')}]`,
      };
    }

    // Rollout authorization cannot be enabled in C2D.9
    if (auth.rolloutAuthorized === true) {
      return {
        isValid: false,
        status: 'NO-GO',
        missingFields: [],
        reason: 'GOVERNANCE_VIOLATION: rolloutAuthorized cannot be TRUE in C2D.9',
      };
    }

    return {
      isValid: true,
      status: 'PASS',
      missingFields: [],
      authorization: auth as HumanCanaryAuthorization,
    };
  }

  /**
   * Applies the human authorization to the 5 separated authorization gates.
   */
  static applyAuthorizationGates(auth: HumanCanaryAuthorization): {
    ACTIVATION: boolean;
    DEPLOYMENT: boolean;
    CLAIMS: boolean;
    MIGRATION: boolean;
    ROLLOUT: boolean;
  } {
    resetAllGates();

    // 1. Activation Gate
    ActivationAuthorizationGate.request(auth.authorizedBy, 'Human Canary Authorization Granted', auth.tenantId);
    ActivationAuthorizationGate.review(auth.authorizedBy);
    ActivationAuthorizationGate.approve(auth.authorizedBy);

    // 2. Deployment Gate (locked in C2D.9)
    // Stays UNINITIALIZED / false

    // 3. Claims Gate
    if (auth.claimsAuthorized === true) {
      ClaimsActivationGate.request(auth.authorizedBy, 'Explicit Claims Authorization', auth.tenantId);
      ClaimsActivationGate.review(auth.authorizedBy);
      ClaimsActivationGate.approve(auth.authorizedBy);
    }

    // 4. Migration Gate (locked in C2D.9)
    // Stays UNINITIALIZED / false

    // 5. Rollout Gate (strictly locked in C2D.9)
    // Stays UNINITIALIZED / false

    return {
      ACTIVATION: ActivationAuthorizationGate.isAuthorized(),
      DEPLOYMENT: DeploymentAuthorizationGate.isAuthorized(),
      CLAIMS: ClaimsActivationGate.isAuthorized(),
      MIGRATION: MigrationAuthorizationGate.isAuthorized(),
      ROLLOUT: RolloutAuthorizationGate.isAuthorized(),
    };
  }

  /**
   * Creates a canonical valid HumanCanaryAuthorization fixture for candidate testing.
   */
  static createCanonicalAuthorization(candidateId: string, tenantId: string): HumanCanaryAuthorization {
    const now = Date.now();
    return {
      authorizationId: `auth-c2d9-${candidateId}-${now}`,
      authorizedBy: 'SYSTEM_OWNER_HUMAN',
      authorizationTimestamp: now,
      tenantId,
      brandId: `brand-${tenantId}`,
      businessId: `biz-${tenantId}`,
      branchId: `branch-${tenantId}`,
      subscriptionPlan: 'PROFESSIONAL',
      approvedScope: [
        'CORE_BACKEND', 'TENANT', 'BRAND', 'BUSINESS', 'BRANCH',
        'SUBSCRIPTION', 'ENTITLEMENTS', 'MEMBERSHIP', 'GATEKEEPER',
        'WEB_EXPERIENCE', 'ANDROID_EXPERIENCE', 'INITIAL_CONFIGURATION'
      ],
      excludedScope: [
        'ADDITIONAL_TENANTS', 'ADDITIONAL_BRANDS', 'ADDITIONAL_USERS',
        'BULK_PROVISIONING', 'MIGRATION', 'MASS_CLAIMS_ROLLOUT',
        'GENERAL_CANARY', 'MARKETPLACE_WIDE_ACTIVATION'
      ],
      canaryPercentage: 0.01,
      canaryRequestLimit: 1,
      activationWindow: {
        windowId: `win-auth-${now}`,
        start: now,
        end: now + 3600000,
        timezone: 'America/Mexico_City',
        changeFreeze: true,
        supportWindow: { startOffset: 1800000, endOffset: 3600000 },
        rollbackDeadline: now + 2700000,
        observationWindow: { durationMs: 1800000, healthCheckIntervalMs: 60000 },
      },
      rollbackDeadline: now + 2700000,
      abortCriteriaVersion: '2.9.0',
      successCriteriaVersion: '2.9.0',
      claimsAuthorized: false,
      deploymentAuthorized: false,
      migrationAuthorized: false,
      rolloutAuthorized: false,
    };
  }
}
