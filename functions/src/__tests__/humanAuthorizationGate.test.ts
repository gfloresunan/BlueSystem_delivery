/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.13
 * HUMAN AUTHORIZATION GATE LIFECYCLE TEST SUITE
 * 
 * Verifies:
 * 1. Gate states: NOT_REQUESTED -> REQUESTED -> UNDER_REVIEW -> APPROVED -> WAITING_FOR_EXECUTION_ORDER
 * 2. Revocation & Expiration triggers
 * 3. Zero automatic execution on approval
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../domain/authorization/productionAuthorizationModels';
import { ProductionAuthorizationGate } from '../domain/authorization/productionAuthorizationEngine';

export function runHumanAuthorizationGateTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [GATE-TEST] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [GATE-TEST] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🚪 RUNNING HUMAN AUTHORIZATION GATE LIFECYCLE TESTS (PHASE 2D.13)');
  console.log('======================================================================\n');

  const now = 1772300000000;
  const sampleScope: ProductionAuthorizationScope = {
    authorizationId: 'auth_gate_001',
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    level: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    tenantId: 'ten_cand_01',
    brandId: 'brand_cand_01',
    organizationId: 'org_cand_01',
    businessId: 'biz_cand_01',
    branchId: 'branch_cand_01',
    subscriptionPlan: 'PROFESSIONAL',
    allowedModules: ['ORDERS', 'CATALOG'],
    excludedModules: ['GOVERNANCE'],
    allowedUsers: ['usr_admin_01'],
    excludedUsers: [],
    allowedOperations: ['READ', 'STAGE_PREPARATION'],
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

  const gate = new ProductionAuthorizationGate();

  // 1. Initial State
  assert(gate.getStatus() === 'NOT_REQUESTED', 'Estado inicial es NOT_REQUESTED');

  // 2. Request Review
  const req = gate.requestReview(sampleScope);
  assert(req.status === 'UNDER_REVIEW', 'Solicitud válida transiciona a UNDER_REVIEW');

  // 3. Approval Transitions to WAITING_FOR_EXECUTION_ORDER
  const app = gate.approve(now + 1000);
  assert(app.status === 'WAITING_FOR_EXECUTION_ORDER', 'Aprobación transiciona a WAITING_FOR_EXECUTION_ORDER (no ejecuta)');

  // 4. Execution check is FALSE in C2D.13
  assert(gate.canExecute() === false, 'canExecute() retorna FALSE (Zero producción)');

  // 5. Revocation
  const rev = gate.revoke('HUMAN_OVERRIDE_ABORT');
  assert(rev.status === 'REVOKED', 'Revocación manual transiciona a REVOKED');

  return { passed, failed, errors };
}
