/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.15
 * FIRST PRODUCTION TENANT EXECUTION TEST SUITE
 * 
 * Verifies:
 * 1. Single Tenant Execution (1 Tenant, 1 Brand, 1 Org, 1 Biz, 1 Branch, 1 Admin)
 * 2. Idempotency and compensation
 * 3. Terminal state WAITING_FOR_HUMAN_DECISION
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationPayload
} from '../productionActivation/productionActivationModels';
import { ProductionExecutionEngine } from '../productionActivation/productionExecutionEngine';

export function runFirstProductionTenantExecutionTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D15-EXEC] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D15-EXEC] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🏛️ RUNNING FIRST PRODUCTION TENANT EXECUTION TESTS (C2D.15)');
  console.log('======================================================================\n');

  const now = 1772500000000;
  const validPayload: ProductionAuthorizationPayload = {
    authorizationId: 'auth_prod_first_001',
    authorizationVersion: '2.15.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'First Controlled Commercial Tenant Pilot',
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    environment: 'PRODUCTION',
    tenantId: 'ten_prod_commercial_01',
    brandId: 'brand_prod_commercial_01',
    organizationId: 'org_prod_commercial_01',
    businessId: 'biz_prod_commercial_01',
    branchId: 'branch_prod_commercial_01',
    administratorUid: 'usr_prod_admin_01',
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
    scopeHash: 'hash_c2d15_prod_001',
    authorizationSignature: 'sig_valid_human_owner'
  };

  const engine = new ProductionExecutionEngine();

  // Test 1: Full Valid Production Activation
  const res1 = engine.execute(validPayload, now);
  assert(res1.status === 'SUCCESS', 'Execution: Primera activación productiva completada en modo gobernado');
  assert(res1.claimsIssuedCount === 1, 'Claims: Exactamente 1 claim emitido al administrador autorizado');
  assert(res1.canaryRequestsServed === 1, 'Canary: Exactamente 1 petición canary servida dentro del límite (<= 10)');
  assert(res1.terminalState === 'WAITING_FOR_HUMAN_DECISION', 'Governance Stop: Estado terminal WAITING_FOR_HUMAN_DECISION');

  // Test 2: Injected Compensation
  const failPayload = { ...validPayload, authorizationId: 'auth_prod_fail_002' };
  const res2 = engine.execute(failPayload, now, 'STEP_PROVISIONING_INJECTED_ERROR');
  assert(res2.status === 'COMPENSATED', 'Compensation: Reversión LIFO ejecutada tras fallo inyectado');
  assert(res2.residualStateCount === 0, 'Zero Residuals: residualStateCount = 0 verificado tras compensación');

  // Test 3: Replay with consumed ID
  const res3 = engine.execute(validPayload, now);
  assert(res3.status === 'DENIED', 'Idempotency: Re-ejecución con token de autorización consumido es rechazada');

  return { passed, failed, errors };
}
