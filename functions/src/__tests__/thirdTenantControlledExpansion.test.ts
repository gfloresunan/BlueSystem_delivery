/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.21
 * THIRD TENANT CONTROLLED EXPANSION TEST SUITE (C2D.21)
 */

import {
  ThirdTenantAuthorizationPackage
} from '../domain/expansion/thirdTenantExpansionValidator';
import {
  ThirdTenantProductionEngine
} from '../domain/expansion/thirdTenantProductionEngine';
import { ProductionAuthorizationLevel } from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runThirdTenantControlledExpansionTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D21-EXPANSION] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D21-EXPANSION] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🚀 RUNNING THIRD TENANT CONTROLLED EXPANSION TESTS (C2D.21)');
  console.log('======================================================================\n');

  ThirdTenantProductionEngine.resetState();

  const now = 1773000000000;

  const validThirdTenantPayload: ThirdTenantAuthorizationPackage = {
    authorizationId: 'auth-exp-prod-03-1773000000000',
    authorizationVersion: '2.21.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'Third Tenant Controlled Expansion & Canary',
    authorizationType: 'CONTROLLED_EXPANSION',
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION,
    status: 'HUMAN_AUTHORIZED',
    environment: 'PRODUCTION',
    firebaseProjectId: 'bluesystem-delivery',
    scopeBounds: {
      additionalTenants: 1,
      targetTotalActiveTenants: 3,
      additionalBrands: 1,
      additionalOrganizations: 1,
      additionalBusinesses: 1,
      additionalBranches: 1,
      additionalAdmins: 1
    },
    targetScope: {
      tenantId: 'ten-live-commercial-03',
      brandId: 'brand-live-commercial-03',
      organizationId: 'org-live-commercial-03',
      businessId: 'biz-live-commercial-03',
      branchId: 'branch-live-commercial-03',
      administratorUid: 'usr-live-admin-03'
    },
    subscription: {
      subscriptionPlan: 'PROFESSIONAL',
      authorizedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS']
    },
    canary: {
      authorized: true,
      maxRequests: 10,
      maxPercentage: 0.01
    },
    independentGates: {
      deploymentAuthorized: false,
      claimsAuthorized: true,
      migrationAuthorized: false,
      provisioningAuthorized: true,
      canaryAuthorized: true,
      canaryExpansionAuthorized: false,
      rolloutAuthorized: false,
      massProvisioningAuthorized: false,
      massClaimsAuthorized: false,
      level7Authorized: false
    },
    governanceGuards: {
      killSwitchRequired: true,
      rollbackRequired: true,
      humanDecisionAfterCanaryRequired: true
    },
    scopeHash: 'sha256_hash_expansion_payload_c2d21',
    authorizationSignature: 'SIG_HUMAN_EXPANSION_OWNER_03_VALID'
  };

  // Test 1: Production Preflight Check
  const preflight = ThirdTenantProductionEngine.runPreflight(validThirdTenantPayload, now);
  assert(
    preflight.isPassed && preflight.tenant01Healthy && preflight.tenant02Healthy && preflight.tenant03Absent,
    'Production Preflight: Tenants 01 y 02 saludables; Tenant 03 ausente; 0 drift detectado'
  );

  // Test 2: Controlled Execution with Valid Authorization Package
  const execRes = ThirdTenantProductionEngine.executeControlledExpansion(validThirdTenantPayload, now);
  assert(
    execRes.success &&
    execRes.provisioningStatus === 'SUCCESS' &&
    execRes.claimsStatus === 'ISSUED' &&
    execRes.canaryStatus === 'SUCCESS' &&
    execRes.canaryRequestsServed === 1 &&
    execRes.mutations.authorizedDocumentsCreated === 7 &&
    execRes.mutations.authorizedClaimsMutations === 1 &&
    execRes.mutations.unauthorizedMutations === 0 &&
    execRes.killSwitchState === 'ARMED' &&
    execRes.terminalState === 'WAITING_FOR_HUMAN_DECISION',
    'Controlled Expansion Execution: Tenant 03 provisionado y activado en Canary (1 request)'
  );

  // Test 3: Idempotency Exact Replay
  const replayRes = ThirdTenantProductionEngine.executeControlledExpansion(validThirdTenantPayload, now);
  assert(
    replayRes.success &&
    replayRes.provisioningStatus === 'REPLAYED' &&
    replayRes.mutations.authorizedDocumentsCreated === 0,
    'Idempotency: Replay exacto retorna REPLAYED sin crear documentos duplicados'
  );

  // Test 4: Conflict Detection on Modified Replay
  const conflictPayload = {
    ...validThirdTenantPayload,
    targetScope: { ...validThirdTenantPayload.targetScope, administratorUid: 'usr-live-admin-99' }
  };
  const conflictRes = ThirdTenantProductionEngine.executeControlledExpansion(conflictPayload, now);
  assert(
    !conflictRes.success && conflictRes.terminalState === 'CONFLICT' && conflictRes.provisioningStatus === 'CONFLICT',
    'Conflict Detection: Replay modificado aborta con estado CONFLICT fail-closed'
  );

  // Test 5: Injected Failure & Transactional Compensation
  const failAuth = {
    ...validThirdTenantPayload,
    authorizationId: 'auth-exp-fail-03-test'
  };
  const compRes = ThirdTenantProductionEngine.executeControlledExpansion(failAuth, now, 'SUBSCRIPTION');
  assert(
    !compRes.success &&
    compRes.provisioningStatus === 'COMPENSATED' &&
    compRes.residualRollbackStateCount === 0,
    'Compensation: Fallo en etapa compensa inmediatamente dejando residualStateCount = 0'
  );

  return { passed, failed, errors };
}
