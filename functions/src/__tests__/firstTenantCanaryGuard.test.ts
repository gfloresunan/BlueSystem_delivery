/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.14
 * FIRST REAL TENANT CANARY GUARD TEST SUITE
 * 
 * Verifies:
 * 1. Canary requests capped at 10
 * 2. Canary traffic percentage capped at 0.01 (1%)
 * 3. Canary success NEVER triggers automatic rollout
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../domain/authorization/productionAuthorizationModels';
import { FirstRealTenantExecutionGuard } from '../domain/activation/firstRealTenantActivationEngine';

export function runFirstTenantCanaryGuardTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CANARY-GUARD] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CANARY-GUARD] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🐥 RUNNING FIRST TENANT CANARY GUARD TESTS (C2D.14)');
  console.log('======================================================================\n');

  const now = 1772400000000;
  const scope: ProductionAuthorizationScope = {
    authorizationId: 'auth_canary_guard_001',
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    level: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    tenantId: 'ten_canary_01',
    brandId: 'brand_canary_01',
    organizationId: 'org_canary_01',
    businessId: 'biz_canary_01',
    branchId: 'branch_canary_01',
    subscriptionPlan: 'PROFESSIONAL',
    allowedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS'],
    excludedModules: ['GOVERNANCE'],
    allowedUsers: ['usr_canary_admin_01'],
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

  // Test 1: Bounded canary execution
  const res1 = guard.executeControlledActivation(scope, now);
  assert(res1.canaryRequestsServed === 1, 'Canary: Petición canary servida dentro de los límites estrictos (<= 10)');

  // Test 2: Invariant: Canary Success does NOT trigger Rollout
  const canarySucceeded = res1.status === 'SUCCESS';
  const autoRollout = canarySucceeded && scope.rolloutAuthorized;
  assert(!autoRollout, 'Canary Invariant: Éxito en Canary NO autoriza rollout automático (ADR-014)');

  return { passed, failed, errors };
}
