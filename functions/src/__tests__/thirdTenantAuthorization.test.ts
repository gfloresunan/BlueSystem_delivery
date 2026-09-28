/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.21
 * THIRD TENANT AUTHORIZATION VALIDATION TEST SUITE (C2D.21)
 */

import {
  ThirdTenantAuthorizationPackage,
  ThirdTenantExpansionValidator
} from '../domain/expansion/thirdTenantExpansionValidator';
import { ProductionAuthorizationLevel } from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runThirdTenantAuthorizationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D21-AUTH] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D21-AUTH] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('📜 RUNNING THIRD TENANT AUTHORIZATION TESTS (C2D.21)');
  console.log('======================================================================\n');

  const now = 1773000000000;

  const validPayload: ThirdTenantAuthorizationPackage = {
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

  // Test 1: Full Valid Level 6 Payload
  const res1 = ThirdTenantExpansionValidator.validate(validPayload, now);
  assert(res1.isValid, 'Valid Authorization: Aceptada con LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION');

  // Test 2: Missing Fields
  const res2 = ThirdTenantExpansionValidator.validate({}, now);
  assert(!res2.isValid && res2.violationCode === 'MISSING_FIELDS', 'Missing Fields: Rechazada fail-closed');

  // Test 3: Expired Validity Window
  const res3 = ThirdTenantExpansionValidator.validate(validPayload, now + 4000000);
  assert(!res3.isValid && res3.violationCode === 'EXPIRED_AUTHORIZATION_WINDOW', 'Expired Window: Rechazada');

  // Test 4: Replay Protection
  const consumed = new Set([validPayload.authorizationId]);
  const res4 = ThirdTenantExpansionValidator.validate(validPayload, now, consumed);
  assert(!res4.isValid && res4.violationCode === 'REPLAYED_AUTHORIZATION', 'Replay Protection: Re-uso de autorización rechazado');

  // Test 5: Wrong Level (LEVEL_7 attempt)
  const wrongLevel = {
    ...validPayload,
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION as any
  };
  const res5 = ThirdTenantExpansionValidator.validate(wrongLevel, now);
  assert(!res5.isValid && res5.violationCode === 'INVALID_AUTHORIZATION_LEVEL', 'Level Confinement: Rechaza niveles no autorizados');

  // Test 6: Target Tenant Mismatch
  const wrongTarget = {
    ...validPayload,
    targetScope: { ...validPayload.targetScope, tenantId: 'ten-live-commercial-04' }
  };
  const res6 = ThirdTenantExpansionValidator.validate(wrongTarget, now);
  assert(!res6.isValid && res6.violationCode === 'TARGET_TENANT_MISMATCH', 'Target Confinement: Rechaza cualquier tenant distinto de ten-03');

  // Test 7: Collision with Existing Tenant 01 or 02
  const collision = {
    ...validPayload,
    targetScope: { ...validPayload.targetScope, tenantId: 'ten-live-commercial-01' }
  };
  const res7 = ThirdTenantExpansionValidator.validate(collision, now);
  assert(!res7.isValid, 'Collision Check: Bloquea colisión con tenants existentes');

  // Test 8: Non-Transitivity (Rollout Authorization Attempt)
  const autoRollout = {
    ...validPayload,
    independentGates: { ...validPayload.independentGates, rolloutAuthorized: true }
  };
  const res8 = ThirdTenantExpansionValidator.validate(autoRollout, now);
  assert(!res8.isValid && res8.violationCode === 'ROLLOUT_UNAUTHORIZED', 'Non-Transitivity: Rollout estrictamente prohibido');

  return { passed, failed, errors };
}
