/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.17
 * FIRST REAL TENANT PRODUCTION EXECUTION TEST SUITE (C2D.17)
 */

import {
  FirstRealTenantProductionEngine
} from '../domain/humanAuthorization/firstRealTenantProductionEngine';
import {
  HumanAuthorizationPackage,
  ProductionAuthorizationLevel
} from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runFirstRealTenantProductionExecutionTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D17-EXEC] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D17-EXEC] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('⚡ RUNNING FIRST REAL TENANT PRODUCTION EXECUTION TESTS (C2D.17)');
  console.log('======================================================================\n');

  FirstRealTenantProductionEngine.resetState();
  const now = 1772600000000;

  // Test 1: Execution without Authorization -> LOCKED
  const res1 = FirstRealTenantProductionEngine.executeControlledActivation(undefined, now);
  assert(
    !res1.success &&
    res1.terminalState === 'WAITING_FOR_HUMAN_DECISION' &&
    res1.productionMutations === 0,
    'Execution without Authorization: Permanece bloqueado en WAITING_FOR_HUMAN_DECISION'
  );

  // Test 2: Execution with Invalid Authorization -> DENIED
  const res2 = FirstRealTenantProductionEngine.executeControlledActivation({ authorizationId: 'invalid' }, now);
  assert(
    !res2.success &&
    res2.terminalState === 'DENIED' &&
    res2.productionMutations === 0,
    'Execution with Invalid Authorization: Rechazado fail-closed (0 mutaciones)'
  );

  // Test 3: Controlled Execution with Valid Authorization
  const validAuth: HumanAuthorizationPackage = {
    authorizationId: 'auth-prod-pilot-01-1772600000000',
    authorizationVersion: '2.17.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'First Controlled Real Tenant Activation',
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    environment: 'PRODUCTION',
    firebaseProjectId: 'bluesystem-delivery',
    targetScope: {
      tenantId: 'ten-live-commercial-01',
      brandId: 'brand-live-commercial-01',
      organizationId: 'org-live-commercial-01',
      businessId: 'biz-live-commercial-01',
      branchId: 'branch-live-commercial-01',
      administratorUid: 'usr-live-admin-01'
    },
    subscription: {
      subscriptionPlan: 'PROFESSIONAL',
      authorizedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS']
    },
    limits: {
      maxProvisioningCount: 1,
      maxClaimMutationCount: 1,
      maxCanaryRequests: 10,
      maxCanaryPercentage: 0.01
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
    scopeHash: 'sha256_mock',
    authorizationSignature: 'SIG_VALID'
  };

  const res3 = FirstRealTenantProductionEngine.executeControlledActivation(validAuth, now);
  assert(
    res3.success &&
    res3.terminalState === 'WAITING_FOR_HUMAN_DECISION' &&
    res3.tenantId === 'ten-live-commercial-01' &&
    res3.provisioningStatus === 'SUCCESS' &&
    res3.claimsStatus === 'ISSUED' &&
    res3.canaryStatus === 'SUCCESS' &&
    res3.productionMutations === 1,
    'Controlled Execution: Provisioning y Canary de 1 solo Tenant ejecutado con éxito'
  );

  // Test 4: Replay Prevention (Subsequent attempt with same authorizationId)
  const res4 = FirstRealTenantProductionEngine.executeControlledActivation(validAuth, now);
  assert(
    !res4.success &&
    res4.terminalState === 'DENIED',
    'Replay Execution Prevention: Reutilización de token rechazada'
  );

  return { passed, failed, errors };
}
