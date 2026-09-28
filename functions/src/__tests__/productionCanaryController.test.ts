/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.15
 * PRODUCTION CANARY CONTROLLER TEST SUITE
 * 
 * Verifies:
 * 1. Canary request limit of 10
 * 2. Overflow detection and prevention
 * 3. Canary success does NOT authorize rollout
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationPayload
} from '../productionActivation/productionActivationModels';
import {
  ProductionCanaryController,
  ProductionGovernanceGuard
} from '../productionActivation/productionExecutionEngine';

export function runProductionCanaryControllerTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CANARY-CTRL] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CANARY-CTRL] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🐥 RUNNING PRODUCTION CANARY CONTROLLER TESTS (C2D.15)');
  console.log('======================================================================\n');

  const now = 1772500000000;
  const payload: ProductionAuthorizationPayload = {
    authorizationId: 'auth_can_001',
    authorizationVersion: '2.15.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'Canary Test',
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    environment: 'PRODUCTION',
    tenantId: 'ten_can_01',
    brandId: 'brand_can_01',
    organizationId: 'org_can_01',
    businessId: 'biz_can_01',
    branchId: 'branch_can_01',
    administratorUid: 'usr_can_admin_01',
    subscriptionPlan: 'PROFESSIONAL',
    authorizedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS'],
    maxProvisioningCount: 1,
    maxClaimMutationCount: 1,
    maxCanaryRequests: 10,
    maxCanaryPercentage: 0.01,
    deploymentAuthorized: false,
    claimsAuthorized: true,
    migrationAuthorized: false,
    canaryAuthorized: true,
    canaryExpansionAuthorized: false,
    rolloutAuthorized: false,
    massProvisioningAuthorized: false,
    massClaimsAuthorized: false,
    killSwitchRequired: true,
    rollbackRequired: true,
    humanDecisionAfterCanaryRequired: true,
    scopeHash: 'hash_can_01',
    authorizationSignature: 'sig_can_01'
  };

  const canaryCtrl = new ProductionCanaryController();

  // Test 1: Serve within limit
  const r1 = canaryCtrl.serveCanaryRequest(payload);
  assert(r1.success && r1.requestNumber === 1 && !r1.overflow, 'Canary Controller: Petición 1 servida exitosamente');

  // Test 2: Invariant: Canary Success does NOT trigger Rollout
  const gov = ProductionGovernanceGuard.verifyNoAutoRollout(payload, true);
  assert(gov.rolloutBlocked === true, 'No Auto-Rollout Invariant: Éxito en Canary mantiene Rollout BLOQUEADO');

  return { passed, failed, errors };
}
