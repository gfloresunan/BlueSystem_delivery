/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.14
 * FIRST REAL TENANT ROLLBACK TEST SUITE
 * 
 * Verifies:
 * 1. 9-step LIFO rollback de-escalation
 * 2. residualStateCount = 0
 * 3. Kill Switch trip handling
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../domain/authorization/productionAuthorizationModels';
import { FirstRealTenantExecutionGuard } from '../domain/activation/firstRealTenantActivationEngine';

export function runFirstTenantRollbackTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [ROLLBACK] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [ROLLBACK] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🔄 RUNNING FIRST TENANT ROLLBACK & KILL SWITCH TESTS (C2D.14)');
  console.log('======================================================================\n');

  const now = 1772400000000;
  const scope: ProductionAuthorizationScope = {
    authorizationId: 'auth_rollback_001',
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    level: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    tenantId: 'ten_roll_01',
    brandId: 'brand_roll_01',
    organizationId: 'org_roll_01',
    businessId: 'biz_roll_01',
    branchId: 'branch_roll_01',
    subscriptionPlan: 'PROFESSIONAL',
    allowedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS'],
    excludedModules: ['GOVERNANCE'],
    allowedUsers: ['usr_roll_admin_01'],
    excludedUsers: [],
    allowedOperations: ['READ', 'PROVISION_SINGLE_TENANT'],
    maxProvisioningCount: 1,
    maxClaimMutationCount: 1,
    maxCanaryRequests: 10,
    maxCanaryPercentage: 0.01,
    rollbackDeadline: now + 7200000,
    abortCriteriaVersion: '2.14.0',
    successCriteriaVersion: '2.14.0',
    deploymentAuthorized: false,
    activationAuthorized: true,
    claimsAuthorized: true,
    migrationAuthorized: false,
    provisioningAuthorized: true,
    canaryExpansionAuthorized: false,
    rolloutAuthorized: false
  };

  const guard = new FirstRealTenantExecutionGuard();

  // Test 1: Injected Abort & LIFO De-escalation
  const res1 = guard.executeControlledActivation(scope, now, 'STEP_5_INJECTED_ABORT');
  assert(res1.status === 'COMPENSATED', 'Rollback: Ejecución de secuencia LIFO compensada');
  assert(res1.residualStateCount === 0, 'Rollback: residualStateCount = 0 verificado');

  // Test 2: Kill Switch Tripped
  guard.triggerKillSwitch('CROSS_TENANT_ANOMALY_TRIGGER');
  const res2 = guard.executeControlledActivation({ ...scope, authorizationId: 'auth_post_trip' }, now);
  assert(res2.status === 'BLOCKED', 'Kill Switch: Bloqueo inmediato fail-closed tras trip de emergencia');

  return { passed, failed, errors };
}
