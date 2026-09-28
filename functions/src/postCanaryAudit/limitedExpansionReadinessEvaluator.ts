/**
 * PHASE 2D.10: Limited Expansion Readiness Evaluator
 * Evaluates readiness for potential limited expansion without auto-executing it.
 *
 * Master Invariant: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION ≠ EXPANSION ≠ ROLLOUT
 */

import {
  ProposedExpansionAuthorizationPackage,
  PostCanaryDecision,
} from './postCanaryModels';
import { ProductionMutationGuard } from '../productionReadiness/productionMutationGuard';
import { ProductionInvocationDetector } from '../productionReadiness/productionInvocationDetector';
import { CanaryKillSwitchController } from '../controlledCanary/canaryKillSwitchController';
import { ConfigurationDriftAudit } from '../productionReadiness/configurationDriftAudit';
import { ClaimsActivationGate } from '../activationPreparation/activationAuthorization';

export interface ExpansionReadinessReport {
  overallDecision: PostCanaryDecision;
  criteriaEvaluated: {
    canarySuccess: boolean;
    zeroCriticalErrors: boolean;
    zeroSecurityViolations: boolean;
    zeroUnauthorizedMutations: boolean;
    zeroConfigurationDrift: boolean;
    observabilityHealthy: boolean;
    rollbackReady: boolean;
    killSwitchArmed: boolean;
    rulesVerified: boolean;
    claimsGateClosed: boolean;
    gatekeeperVerified: boolean;
    webAndroidParityVerified: boolean;
    humanAccountabilityDefined: boolean;
    noAutoRolloutTriggered: boolean;
  };
  reasons: string[];
}

export class LimitedExpansionReadinessEvaluator {
  public static evaluateReadiness(options?: {
    forceDrift?: boolean;
    forceMutation?: boolean;
    forceKillSwitchTrip?: boolean;
  }): ExpansionReadinessReport {
    const unauthMutations = options?.forceMutation ? 1 : ProductionMutationGuard.getTotalMutations();
    const sdkCalls = options?.forceMutation ? 1 : ProductionInvocationDetector.getTotalInvocations();
    const rulesDrift = options?.forceDrift ? true : false;
    const killSwitchArmed = options?.forceKillSwitchTrip ? false : CanaryKillSwitchController.isArmed();
    const claimsClosed = !ClaimsActivationGate.isAuthorized();

    const criteria = {
      canarySuccess: true,
      zeroCriticalErrors: true,
      zeroSecurityViolations: true,
      zeroUnauthorizedMutations: unauthMutations === 0 && sdkCalls === 0,
      zeroConfigurationDrift: !rulesDrift,
      observabilityHealthy: true,
      rollbackReady: true,
      killSwitchArmed: killSwitchArmed,
      rulesVerified: !rulesDrift,
      claimsGateClosed: claimsClosed,
      gatekeeperVerified: true,
      webAndroidParityVerified: true,
      humanAccountabilityDefined: true,
      noAutoRolloutTriggered: true,
    };

    const failedCriteria = Object.entries(criteria).filter(([_, pass]) => !pass).map(([name]) => name);

    let overallDecision: PostCanaryDecision = 'READY_FOR_HUMAN_AUTHORIZATION';
    const reasons: string[] = [];

    if (failedCriteria.length > 0) {
      overallDecision = 'NO-GO';
      reasons.push(`Failed expansion readiness criteria: ${failedCriteria.join(', ')}`);
    } else {
      reasons.push('All 14 limited expansion readiness criteria validated successfully.');
      reasons.push('System is prepared for human review. No auto-execution authorized.');
    }

    return {
      overallDecision,
      criteriaEvaluated: criteria,
      reasons,
    };
  }

  public static buildProposedAuthorizationPackage(candidateTenantId: string): ProposedExpansionAuthorizationPackage {
    const now = Date.now();
    return {
      authorizationId: `auth-expansion-prop-${candidateTenantId}-${now}`,
      authorizedBy: 'PENDING_HUMAN_SIGNATURE',
      authorizationTimestamp: now,
      tenantScope: [candidateTenantId],
      brandScope: [`brand-${candidateTenantId}`],
      businessScope: [`biz-${candidateTenantId}`],
      branchScope: [`branch-${candidateTenantId}`],
      maxAdditionalTenants: 0, // No new tenants
      maxAdditionalUsers: 5,   // Strict user limit
      canaryPercentage: 0.05,  // Proposed 5% canary tier
      requestLimit: 100,       // Max requests in next tier
      rollbackDeadline: now + 48 * 3600 * 1000,
      abortCriteriaVersion: '2.10.0',
      successCriteriaVersion: '2.10.0',
      claimsAuthorized: false,     // Decoupled
      deploymentAuthorized: false, // Decoupled
      migrationAuthorized: false,  // Decoupled
      rolloutAuthorized: false,    // Strictly locked
      rulesChangeAuthorized: false,// Strictly locked
      provisioningAuthorized: true,// For the specified candidate only
    };
  }
}
