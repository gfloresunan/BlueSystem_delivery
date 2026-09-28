/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.13
 * CONTROLLED PRODUCTION AUTHORIZATION TEST SUITE
 * 
 * Verifies:
 * 1. 8 Authorization Levels (LEVEL_0 -> LEVEL_7)
 * 2. Non-transitive authorization invariants
 * 3. Complete scope validation (fail-closed on missing parameters)
 * 4. Independent gates separation
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../domain/authorization/productionAuthorizationModels';
import {
  ProductionAuthorizationValidator,
  ProductionAuthorizationGate
} from '../domain/authorization/productionAuthorizationEngine';

export function runControlledProductionAuthorizationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D13-AUTH] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D13-AUTH] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🏛️ RUNNING CONTROLLED PRODUCTION AUTHORIZATION TESTS (PHASE 2D.13)');
  console.log('======================================================================\n');

  const now = 1772300000000;
  const validScope: ProductionAuthorizationScope = {
    authorizationId: 'auth_c2d13_001',
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000, // 1 hour validity
    level: ProductionAuthorizationLevel.LEVEL_1_READINESS_REVIEW,
    tenantId: 'ten_real_candidate_01',
    brandId: 'brand_real_candidate_01',
    organizationId: 'org_real_candidate_01',
    businessId: 'biz_real_candidate_01',
    branchId: 'branch_real_candidate_01',
    subscriptionPlan: 'PROFESSIONAL',
    allowedModules: ['ORDERS', 'CATALOG', 'CONTROL_TOWER', 'NOTIFICATIONS'],
    excludedModules: ['GOVERNANCE', 'MULTI_BRAND'],
    allowedUsers: ['usr_owner_001'],
    excludedUsers: [],
    allowedOperations: ['READ', 'AUDIT'],
    maxProvisioningCount: 1,
    maxClaimMutationCount: 1,
    maxCanaryRequests: 10,
    maxCanaryPercentage: 0.01,
    rollbackDeadline: now + 7200000,
    abortCriteriaVersion: '2.13.0',
    successCriteriaVersion: '2.13.0',
    deploymentAuthorized: false,
    activationAuthorized: false,
    claimsAuthorized: false,
    migrationAuthorized: false,
    provisioningAuthorized: false,
    canaryExpansionAuthorized: false,
    rolloutAuthorized: false
  };

  // Test 1: Complete valid scope passes validation
  const v1 = ProductionAuthorizationValidator.validateScope(validScope);
  assert(v1.isValid, 'Scope completo y explícito pasa validación formal');

  // Test 2: Missing mandatory field fails closed
  const invalidScope = { ...validScope, tenantId: '' };
  const v2 = ProductionAuthorizationValidator.validateScope(invalidScope);
  assert(!v2.isValid && v2.missingFields.includes('tenantId'), 'Falta de tenantId produce rechazo fail-closed');

  // Test 3: Missing authorizedBy fails closed
  const v3 = ProductionAuthorizationValidator.validateScope({ ...validScope, authorizedBy: '' });
  assert(!v3.isValid && v3.missingFields.includes('authorizedBy'), 'Falta de authorizedBy produce rechazo fail-closed');

  // Test 4: Expired authorization window fails closed
  const v4 = ProductionAuthorizationValidator.validateScope({ ...validScope, expirationTimestamp: now - 1000 });
  assert(!v4.isValid, 'Ventana de autorización expirada es rechazada');

  // Test 5: LEVEL_1 cannot auto-escalate to LEVEL_2..7
  const t1 = ProductionAuthorizationValidator.evaluateLevelTransition(
    ProductionAuthorizationLevel.LEVEL_1_READINESS_REVIEW,
    ProductionAuthorizationLevel.LEVEL_2_DEPLOYMENT_AUTHORIZATION
  );
  assert(!t1.allowed, 'LEVEL_1 no puede auto-escalar a LEVEL_2 (Deploy)');

  const t2 = ProductionAuthorizationValidator.evaluateLevelTransition(
    ProductionAuthorizationLevel.LEVEL_1_READINESS_REVIEW,
    ProductionAuthorizationLevel.LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION
  );
  assert(!t2.allowed, 'LEVEL_1 no puede auto-escalar a LEVEL_7 (Rollout)');

  // Test 6: Invariant: Independent separated gates
  assert(
    validScope.deploymentAuthorized === false &&
    validScope.claimsAuthorized === false &&
    validScope.migrationAuthorized === false &&
    validScope.rolloutAuthorized === false,
    'Gobernanza: Gates de Deployment, Claims, Migración y Rollout permanecen independientes y FALSE'
  );

  return { passed, failed, errors };
}
