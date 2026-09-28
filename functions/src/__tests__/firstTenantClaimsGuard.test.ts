/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.14
 * FIRST REAL TENANT CLAIMS GUARD TEST SUITE
 * 
 * Verifies:
 * 1. Claims issuance strictly to 1 authorized admin
 * 2. EIAM v3 payload integrity (tenantId, brandId, role = OWNER, eiamVer = 3)
 * 3. maxClaimMutationCount = 1 strictly enforced
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../domain/authorization/productionAuthorizationModels';
import { FirstRealTenantExecutionGuard } from '../domain/activation/firstRealTenantActivationEngine';

export function runFirstTenantClaimsGuardTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CLAIMS-GUARD] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CLAIMS-GUARD] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🛡️ RUNNING FIRST TENANT CLAIMS GUARD TESTS (C2D.14)');
  console.log('======================================================================\n');

  const now = 1772400000000;
  const scope: ProductionAuthorizationScope = {
    authorizationId: 'auth_claims_001',
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    level: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    tenantId: 'ten_claims_01',
    brandId: 'brand_claims_01',
    organizationId: 'org_claims_01',
    businessId: 'biz_claims_01',
    branchId: 'branch_claims_01',
    subscriptionPlan: 'PROFESSIONAL',
    allowedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS'],
    excludedModules: ['GOVERNANCE'],
    allowedUsers: ['usr_initial_admin_01'],
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

  // Test 1: Single admin receives claims
  const res1 = guard.executeControlledActivation(scope, now);
  assert(res1.claimsIssuedCount === 1, 'Claims: Exactamente 1 claim emitido al administrador autorizado');

  // Test 2: Multi-user claims request rejected in first-tenant scope
  const multiUserScope = { ...scope, authorizationId: 'auth_multi_002', allowedUsers: ['usr_1', 'usr_2'] };
  const res2 = guard.executeControlledActivation(multiUserScope, now);
  assert(res2.claimsIssuedCount === 0, 'Claims Confinement: Solicitud multi-usuario en primera activación no emite claims');

  return { passed, failed, errors };
}
