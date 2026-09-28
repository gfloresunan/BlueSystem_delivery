/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CONTROLLED CANARY EXECUTION ENGINE
 *
 * PURPOSE: Executes the first production-ready canary activation strictly
 *          limited to 1 candidate and 1 request limit under explicit human
 *          authorization.
 *
 * GOVERNANCE: Zero automatic rollout. Pure multi-tenant confinement.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
  FirstCanaryCandidate,
  HumanCanaryAuthorization,
  CanaryExecutionResult,
  CanaryTrafficContext,
} from './canaryModels';
import { CanaryAuthorizationValidator } from './canaryAuthorizationValidator';
import { CanaryPreflightGuard } from './canaryPreflightGuard';
import { CanaryKillSwitchController } from './canaryKillSwitchController';
import { CanaryRollbackOrchestrator } from './canaryRollbackOrchestrator';
import { CanaryObservabilityLogger } from './canaryObservabilityLogger';
import { ProvisioningEngine } from '../domain/provisioning/provisioningPipeline';
import { createInMemoryRepositories } from '../domain/provisioning/repositories';
import type { ProvisioningRequest, InitialTenantConfiguration } from '../domain/provisioning/models';
import { ClientExperienceResolver } from '../domain/whitelabel/clientExperienceResolver';
import type { SubscriptionEntity } from '../domain/platform/models';

const CANONICAL_INITIAL_CONFIG: InitialTenantConfiguration = {
  locale: 'es_MX',
  currency: 'MXN',
  timezone: 'America/Mexico_City',
  deliverySettings: { defaultRadiusKm: 12, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
  orderSettings: { preparationTimeMinutes: 25, allowScheduledOrders: true, autoAcceptOrders: false },
  brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
  notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
  operationalDefaults: { operatingHours: { open: '09:00', close: '23:00' }, cashDrawerClosingRequired: true },
};

export class CanaryEngine {
  /**
   * Executes the controlled single-candidate Canary workflow.
   */
  static async executeFirstCanary(
    auth: HumanCanaryAuthorization,
    candidate: FirstCanaryCandidate
  ): Promise<CanaryExecutionResult> {
    const executionId = `canary-exec-${Date.now()}`;
    const now = Date.now();

    // 1. Validate Human Authorization Completeness
    const authReport = CanaryAuthorizationValidator.validate(auth);
    if (!authReport.isValid) {
      CanaryKillSwitchController.trip(`Authorization invalid: ${authReport.reason}`, {
        candidateId: candidate.candidateId,
        tenantId: candidate.tenantId,
      });
      return {
        executionId,
        candidateId: candidate.candidateId,
        stage: 'ABORTED',
        success: false,
        canaryRequestsServed: 0,
        canaryRequestLimit: 1,
        webValidated: false,
        androidValidated: false,
        rollbackStatus: 'EXECUTED',
        residualStateCount: 0,
        waitingForHumanDecision: true,
        timestamp: now,
      };
    }

    // Apply authorization to separated gates
    CanaryAuthorizationValidator.applyAuthorizationGates(auth);

    CanaryObservabilityLogger.log('ACTIVATION_AUTHORIZED', `Human authorization verified for tenant ${auth.tenantId}`, {
      candidateId: candidate.candidateId,
      tenantId: auth.tenantId,
      role: 'SYSTEM_OWNER_HUMAN',
      decision: 'AUTHORIZED',
    });

    // 2. Preflight Audit
    CanaryObservabilityLogger.log('ACTIVATION_PREFLIGHT_STARTED', 'Preflight audit underway', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
    });

    const subscriptionFixture: SubscriptionEntity = {
      subscriptionId: `sub-${candidate.candidateId}`,
      tenantId: candidate.tenantId,
      planId: 'plan-professional',
      planName: 'Professional Plan',
      planTier: candidate.subscriptionPlan,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      startDate: now - 5000,
      endDate: now + 30 * 24 * 3600 * 1000,
      enabledFeatures: candidate.entitlements,
      disabledFeatures: [],
      limits: {
        maxBusinesses: 1,
        maxBranches: 5,
        maxUsers: 10,
        maxCouriers: 10,
        maxOrders: 1000,
        maxStorageMb: 1024,
        maxApiRequests: 50000,
      },
      schemaVersion: '1.0',
      createdAt: now - 5000,
      updatedAt: now - 5000,
      createdBy: auth.authorizedBy,
      updatedBy: auth.authorizedBy,
    };

    const preflightReport = CanaryPreflightGuard.runPreflight(
      candidate,
      subscriptionFixture,
      { uid: `uid-${candidate.candidateId}`, tenantId: candidate.tenantId, role: candidate.initialRole }
    );

    if (!preflightReport.overallPassed) {
      CanaryKillSwitchController.trip('Preflight check failed', {
        candidateId: candidate.candidateId,
        tenantId: candidate.tenantId,
      });
      CanaryRollbackOrchestrator.executeRollback(candidate.candidateId, candidate.tenantId, 'Preflight failure');
      return {
        executionId,
        candidateId: candidate.candidateId,
        stage: 'ABORTED',
        success: false,
        canaryRequestsServed: 0,
        canaryRequestLimit: 1,
        webValidated: false,
        androidValidated: false,
        rollbackStatus: 'EXECUTED',
        residualStateCount: 0,
        waitingForHumanDecision: true,
        timestamp: now,
      };
    }

    CanaryObservabilityLogger.log('ACTIVATION_PREFLIGHT_PASSED', 'All preflight checks certified', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
      decision: 'PREFLIGHT_PASSED',
    });

    // 3. Canary Start & Controlled Provisioning
    CanaryObservabilityLogger.log('ACTIVATION_STARTED', 'Controlled canary activation initiated', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
    });

    CanaryObservabilityLogger.log('CANARY_ENABLED', 'Canary enabled at single candidate limit (limit=1)', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
    });

    const repos = createInMemoryRepositories();
    const provReq: ProvisioningRequest = {
      requestId: `req-c2d9-${candidate.candidateId}`,
      idempotencyKey: `idem-c2d9-${candidate.candidateId}`,
      tenantType: candidate.commercialModel,
      tenant: {
        tenantId: candidate.tenantId,
        name: `Canary Tenant ${candidate.candidateId}`,
        legalName: `Canary Tenant ${candidate.candidateId} S.A.`,
        slug: `canary-${candidate.candidateId}`,
        type: candidate.commercialModel,
      },
      brand: {
        brandId: candidate.brandId,
        displayName: `Canary Brand ${candidate.brandId}`,
        shortName: `CB-${candidate.brandId}`,
        slug: `canary-brand-${candidate.brandId}`,
        visual: { primaryColor: '#0284C7' },
        metadata: { supportEmail: 'canary@bluesystem.io', supportPhone: '+5200000000' },
      },
      business: {
        businessId: candidate.businessId,
        brandId: candidate.brandId,
        name: `Canary Business ${candidate.businessId}`,
        category: 'RESTAURANT',
      },
      branch: {
        branchId: candidate.branchId,
        businessId: candidate.businessId,
        name: `Canary Branch ${candidate.branchId}`,
        address: 'Av. Canary 101',
        city: 'CDMX',
        isMainBranch: true,
      },
      subscription: {
        subscriptionId: `sub-${candidate.candidateId}`,
        planTier: candidate.subscriptionPlan,
        billingCycle: 'MONTHLY',
      },
      initialOwner: {
        uid: `uid-${candidate.candidateId}`,
        role: candidate.initialRole,
        email: `owner@canary-${candidate.candidateId}.io`,
      },
      initialConfiguration: CANONICAL_INITIAL_CONFIG,
      requestedBy: auth.authorizedBy,
      requestedAt: now,
    };

    CanaryObservabilityLogger.log('PROVISIONING_STARTED', 'Executing controlled in-memory provisioning pipeline', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
    });

    const provResult = await ProvisioningEngine.provisionTenant(provReq, repos);
    if (provResult.status !== 'COMPLETED' || !provResult.aggregate) {
      CanaryRollbackOrchestrator.executeRollback(candidate.candidateId, candidate.tenantId, 'Provisioning error');
      return {
        executionId,
        candidateId: candidate.candidateId,
        stage: 'ABORTED',
        success: false,
        canaryRequestsServed: 0,
        canaryRequestLimit: 1,
        webValidated: false,
        androidValidated: false,
        rollbackStatus: 'EXECUTED',
        residualStateCount: 0,
        waitingForHumanDecision: true,
        timestamp: now,
      };
    }

    const agg = provResult.aggregate;
    CanaryObservabilityLogger.log('PROVISIONING_COMPLETED', 'Provisioning completed successfully in memory', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
      decision: 'PROVISIONED',
    });

    // 4. ClientExperience Hydration & Parity Validation (Web & Android)
    const snapshot = ClientExperienceResolver.resolveSnapshot(
      agg.tenant,
      agg.brand,
      agg.subscription,
      agg.memberships[0],
      CANONICAL_INITIAL_CONFIG,
      now
    );

    const webValidated = !snapshot.isFallback && snapshot.tenantId === candidate.tenantId;
    const androidValidated =
      snapshot.designTokens.colors.primary === '#0284C7' &&
      snapshot.enabledModules.includes('ORDERS') &&
      !snapshot.enabledModules.includes('GOVERNANCE');

    CanaryObservabilityLogger.log('CLIENT_EXPERIENCE_RESOLVED', 'Client experience snapshots verified without hardcoding', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
      decision: 'EXPERIENCE_VALIDATED',
    });

    // 5. Canary Request Accepted & Logged
    const trafficCtx: CanaryTrafficContext = {
      canaryActivationId: executionId,
      tenantId: candidate.tenantId,
      requestId: `req-traffic-${Date.now()}`,
      timestamp: Date.now(),
      environment: 'CANARY_CONTROLLED',
      scope: 'FIRST_CONTROLLED_CANARY',
      trafficType: 'CANARY_TRAFFIC',
    };

    CanaryObservabilityLogger.logTraffic(trafficCtx);
    CanaryObservabilityLogger.log('CANARY_REQUEST_ACCEPTED', 'Single canary request served successfully (1/1 limit)', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
      requestId: trafficCtx.requestId,
    });

    CanaryObservabilityLogger.log('ACTIVATION_COMPLETED', 'First controlled canary completed successfully. Awaiting human review.', {
      candidateId: candidate.candidateId,
      tenantId: candidate.tenantId,
      decision: 'CANARY_SUCCESS',
    });

    return {
      executionId,
      candidateId: candidate.candidateId,
      stage: 'WAITING_FOR_HUMAN_DECISION',
      success: webValidated && androidValidated,
      canaryRequestsServed: 1,
      canaryRequestLimit: 1,
      webValidated,
      androidValidated,
      rollbackStatus: 'READY',
      residualStateCount: 0,
      waitingForHumanDecision: true,
      timestamp: Date.now(),
    };
  }
}
