/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.17
 * HUMAN AUTHORIZATION VALIDATION TEST SUITE (C2D.17)
 */

import {
  HumanAuthorizationPackage,
  HumanAuthorizationValidator,
  ProductionAuthorizationLevel
} from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runHumanAuthorizationValidationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D17-AUTH] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D17-AUTH] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('📜 RUNNING HUMAN AUTHORIZATION VALIDATION TESTS (C2D.17)');
  console.log('======================================================================\n');

  const now = 1772600000000;

  const validPayload: HumanAuthorizationPackage = {
    authorizationId: 'auth-prod-pilot-01-1772600000000',
    authorizationVersion: '2.17.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000, // +1 hour
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
    scopeHash: 'sha256_hash_mock_payload',
    authorizationSignature: 'SIG_HUMAN_OWNER_VALID'
  };

  // Test 1: Full Valid Payload
  const res1 = HumanAuthorizationValidator.validate(validPayload, now);
  assert(res1.isValid, 'Valid Authorization Payload: Aceptada correctamente');

  // Test 2: Missing Required Fields
  const res2 = HumanAuthorizationValidator.validate({}, now);
  assert(!res2.isValid && res2.violationCode === 'MISSING_FIELDS', 'Missing Fields: Rechazada fail-closed');

  // Test 3: Expired Authorization Window
  const res3 = HumanAuthorizationValidator.validate(validPayload, now + 4000000);
  assert(!res3.isValid && res3.violationCode === 'EXPIRED_AUTHORIZATION_WINDOW', 'Expired Window: Rechazada');

  // Test 4: Replayed Authorization
  const consumed = new Set([validPayload.authorizationId]);
  const res4 = HumanAuthorizationValidator.validate(validPayload, now, consumed);
  assert(!res4.isValid && res4.violationCode === 'REPLAYED_AUTHORIZATION', 'Replay Protection: Rechazada');

  // Test 5: Mass Provisioning Violation
  const massProv = { ...validPayload, limits: { ...validPayload.limits, maxProvisioningCount: 2 } };
  const res5 = HumanAuthorizationValidator.validate(massProv, now);
  assert(!res5.isValid && res5.violationCode === 'MASS_PROVISIONING_FORBIDDEN', 'Mass Provisioning Rejection: Bloqueado');

  // Test 6: Non-Transitivity (Rollout Auto-Authorization Attempt)
  const autoRollout = {
    ...validPayload,
    independentGates: { ...validPayload.independentGates, rolloutAuthorized: true }
  };
  const res6 = HumanAuthorizationValidator.validate(autoRollout, now);
  assert(!res6.isValid && res6.violationCode === 'ROLLOUT_UNAUTHORIZED', 'Non-Transitivity: Rollout en LEVEL_3 bloqueado');

  return { passed, failed, errors };
}
