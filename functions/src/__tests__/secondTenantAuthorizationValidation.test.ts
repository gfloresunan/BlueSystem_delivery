/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.19
 * SECOND TENANT AUTHORIZATION VALIDATION TEST SUITE (C2D.19)
 */

import {
  ControlledExpansionAuthorizationPackage,
  ControlledExpansionValidator
} from '../domain/expansion/controlledExpansionValidator';
import { ProductionAuthorizationLevel } from '../domain/humanAuthorization/humanAuthorizationValidator';

export function runSecondTenantAuthorizationValidationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D19-AUTH] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D19-AUTH] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('📜 RUNNING SECOND TENANT AUTHORIZATION VALIDATION TESTS (C2D.19)');
  console.log('======================================================================\n');

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

  // Test 1: Full Valid Expansion Payload
  const res1 = ControlledExpansionValidator.validate(validExpansionPayload, now);
  assert(res1.isValid, 'Valid Expansion Payload: Aceptada correctamente con LEVEL_6');

  // Test 2: Missing Fields Check
  const res2 = ControlledExpansionValidator.validate({}, now);
  assert(!res2.isValid && res2.violationCode === 'MISSING_FIELDS', 'Missing Fields: Rechazada fail-closed');

  // Test 3: Expired Authorization Window
  const res3 = ControlledExpansionValidator.validate(validExpansionPayload, now + 4000000);
  assert(!res3.isValid && res3.violationCode === 'EXPIRED_AUTHORIZATION_WINDOW', 'Expired Window: Rechazada');

  // Test 4: Replay Protection
  const consumed = new Set([validExpansionPayload.authorizationId]);
  const res4 = ControlledExpansionValidator.validate(validExpansionPayload, now, consumed);
  assert(!res4.isValid && res4.violationCode === 'REPLAYED_AUTHORIZATION', 'Replay Protection: Consumo único garantizado');

  // Test 5: Wrong Level (e.g. LEVEL_3 instead of LEVEL_6)
  const wrongLevel = {
    ...validExpansionPayload,
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION as any
  };
  const res5 = ControlledExpansionValidator.validate(wrongLevel, now);
  assert(!res5.isValid && res5.violationCode === 'INVALID_AUTHORIZATION_LEVEL', 'Level Enforcement: Rechaza cualquier nivel distinto de LEVEL_6');

  // Test 6: Scope Inflation (additionalTenants > 1)
  const scopeInflation = {
    ...validExpansionPayload,
    scopeBounds: { ...validExpansionPayload.scopeBounds, additionalTenants: 2 }
  };
  const res6 = ControlledExpansionValidator.validate(scopeInflation, now);
  assert(!res6.isValid && res6.violationCode === 'INVALID_ADDITIONAL_TENANTS', 'Scope Bounds: Rechaza additionalTenants > 1');

  // Test 7: Collision Check (Target collides with ten-live-commercial-01)
  const collision = {
    ...validExpansionPayload,
    targetScope: { ...validExpansionPayload.targetScope, tenantId: 'ten-live-commercial-01' }
  };
  const res7 = ControlledExpansionValidator.validate(collision, now);
  assert(!res7.isValid && res7.violationCode === 'TENANT_COLLISION', 'Collision Check: Detecta y bloquea colisión/takeover de tenant existente');

  // Test 8: Non-Transitivity (Rollout Authorization Attempt in LEVEL_6)
  const autoRollout = {
    ...validExpansionPayload,
    independentGates: { ...validExpansionPayload.independentGates, rolloutAuthorized: true }
  };
  const res8 = ControlledExpansionValidator.validate(autoRollout, now);
  assert(!res8.isValid && res8.violationCode === 'ROLLOUT_UNAUTHORIZED', 'Non-Transitivity: Rollout estrictamente prohibido en LEVEL_6');

  return { passed, failed, errors };
}
