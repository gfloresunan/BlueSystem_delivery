/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.19
 * SECOND TENANT PRODUCTION EXECUTION TEST SUITE (C2D.19)
 */

import {
  ControlledExpansionAuthorizationPackage
} from '../domain/expansion/controlledExpansionValidator';
import {
  SecondTenantProductionEngine
} from '../domain/expansion/secondTenantProductionEngine';
import { ProductionAuthorizationLevel } from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runSecondTenantProductionExecutionTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D19-EXEC] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D19-EXEC] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🚀 RUNNING SECOND TENANT PRODUCTION EXECUTION TESTS (C2D.19)');
  console.log('======================================================================\n');

  SecondTenantProductionEngine.resetState();

  const now = 1772800000000;

  const validExpansionPayload: ControlledExpansionAuthorizationPackage = {
    authorizationId: 'auth-exp-prod-02-1772800000000',
    authorizationVersion: '2.19.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'Controlled Second Tenant Expansion & Canary',
    authorizationType: 'CONTROLLED_EXPANSION',
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION,
    status: 'HUMAN_AUTHORIZED',
    environment: 'PRODUCTION',
    firebaseProjectId: 'bluesystem-delivery',
    scopeBounds: {
      additionalTenants: 1,
      totalActiveTenants: 2,
      additionalBrands: 1,
      additionalBusinesses: 1,
      additionalBranches: 1,
      additionalAdmins: 1
    },
    targetScope: {
      tenantId: 'ten-live-commercial-02',
      brandId: 'brand-live-commercial-02',
      organizationId: 'org-live-commercial-02',
      businessId: 'biz-live-commercial-02',
      branchId: 'branch-live-commercial-02',
      administratorUid: 'usr-live-admin-02'
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
      massClaimsAuthorized: false
    },
    governanceGuards: {
      killSwitchRequired: true,
      rollbackRequired: true,
      humanDecisionAfterCanaryRequired: true
    },
    scopeHash: 'sha256_hash_expansion_payload_c2d19',
    authorizationSignature: 'SIG_HUMAN_EXPANSION_OWNER_VALID'
  };

  // Test 1: Production Preflight Check
  const preflight = SecondTenantProductionEngine.runPreflight(validExpansionPayload, now);
  assert(
    preflight.isPassed && preflight.governanceValid && preflight.securityValid && preflight.operationalValid,
    'Production Preflight: Todos los checks de gobernanza, seguridad y operación pasan'
  );

  // Test 2: Execution without Human Authorization Package (Lock)
  const noAuthRes = SecondTenantProductionEngine.executeControlledExpansion(undefined, now);
  assert(
    !noAuthRes.success && noAuthRes.terminalState === 'WAITING_FOR_HUMAN_DECISION' && noAuthRes.mutations.unauthorizedMutations === 0,
    'Zero-Auth Lock: Sin autorización no muta y permanece en WAITING_FOR_HUMAN_DECISION'
  );

  // Test 3: Controlled Execution with Valid Authorization Package
  const execRes = SecondTenantProductionEngine.executeControlledExpansion(validExpansionPayload, now);
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
    'Controlled Expansion Execution: Provisioning, Claims y Canary (1 request) ejecutados con éxito'
  );

  // Test 4: Idempotency (Exact Replay)
  const replayRes = SecondTenantProductionEngine.executeControlledExpansion(validExpansionPayload, now);
  assert(
    replayRes.success &&
    replayRes.provisioningStatus === 'REPLAYED' &&
    replayRes.mutations.authorizedDocumentsCreated === 0 &&
    replayRes.mutations.unauthorizedMutations === 0,
    'Idempotency: Replay exacto retorna REPLAYED sin duplicar documentos'
  );

  // Test 5: Conflict Detection (Modified Replay)
  const modifiedReplay = {
    ...validExpansionPayload,
    targetScope: { ...validExpansionPayload.targetScope, administratorUid: 'usr-live-admin-99' }
  };
  const conflictRes = SecondTenantProductionEngine.executeControlledExpansion(modifiedReplay, now);
  assert(
    !conflictRes.success && conflictRes.terminalState === 'CONFLICT' && conflictRes.provisioningStatus === 'CONFLICT',
    'Conflict Detection: Replay modificado genera estado CONFLICT y aborta fail-closed'
  );

  // Test 6: Injected Failure & Transactional Compensation
  const failAuth = {
    ...validExpansionPayload,
    authorizationId: 'auth-exp-fail-test-01'
  };
  const compRes = SecondTenantProductionEngine.executeControlledExpansion(failAuth, now, 'SUBSCRIPTION');
  assert(
    !compRes.success &&
    compRes.provisioningStatus === 'COMPENSATED' &&
    compRes.residualRollbackStateCount === 0,
    'Transactional Compensation: Fallo inyectado en etapa compensa y deja residualStateCount = 0'
  );

  return { passed, failed, errors };
}
