/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.21
 * THIRD TENANT PROVISIONING PIPELINE TEST SUITE (C2D.21)
 */

import {
  ThirdTenantAuthorizationPackage
} from '../domain/expansion/thirdTenantExpansionValidator';
import {
  ThirdTenantProductionEngine
} from '../domain/expansion/thirdTenantProductionEngine';
import { ProductionAuthorizationLevel } from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runThirdTenantProvisioningTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D21-PROV] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D21-PROV] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🏗️ RUNNING THIRD TENANT PROVISIONING TESTS (C2D.21)');
  console.log('======================================================================\n');

  ThirdTenantProductionEngine.resetState();

  const now = 1773000000000;
  const payload: ThirdTenantAuthorizationPackage = {
    authorizationId: 'auth-prov-03-test',
    authorizationVersion: '2.21.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'Third Tenant Provisioning',
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

  // Test 1: Atomic 7-Stage Creation
  const res1 = ThirdTenantProductionEngine.executeControlledExpansion(payload, now);
  assert(res1.success && res1.provisioningStatus === 'SUCCESS', 'Atomic Provisioning: 7 etapas creadas atómicamente');

  // Test 2: Idempotency Exact Replay
  const res2 = ThirdTenantProductionEngine.executeControlledExpansion(payload, now);
  assert(res2.provisioningStatus === 'REPLAYED', 'Idempotency: Re-ejecución retorna REPLAYED');

  // Test 3: Transactional Compensation on Injected Failure
  const res3 = ThirdTenantProductionEngine.executeControlledExpansion(
    { ...payload, authorizationId: 'auth-prov-fail-03' },
    now,
    'SUBSCRIPTION'
  );
  assert(res3.provisioningStatus === 'COMPENSATED' && res3.residualRollbackStateCount === 0, 'Compensation: LIFO rollback deja residualStateCount = 0');

  return { passed, failed, errors };
}
