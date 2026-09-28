/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.15
 * PRODUCTION PREFLIGHT AUDIT TEST SUITE
 * 
 * Verifies all 30 preflight check items.
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationPayload
} from '../productionActivation/productionActivationModels';
import { ProductionPreflightGuard } from '../productionActivation/productionPreflightGuard';

export function runProductionPreflightAuditTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PREFLIGHT] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [PREFLIGHT] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('📋 RUNNING PRODUCTION PREFLIGHT AUDIT TESTS (30 CHECKS)');
  console.log('======================================================================\n');

  const now = 1772500000000;
  const payload: ProductionAuthorizationPayload = {
    authorizationId: 'auth_pre_001',
    authorizationVersion: '2.15.0',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationReason: 'Preflight Audit',
    authorizationLevel: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    environment: 'PRODUCTION',
    tenantId: 'ten_pre_01',
    brandId: 'brand_pre_01',
    organizationId: 'org_pre_01',
    businessId: 'biz_pre_01',
    branchId: 'branch_pre_01',
    administratorUid: 'usr_pre_admin_01',
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
    scopeHash: 'hash_pre_01',
    authorizationSignature: 'sig_pre_01'
  };

  const report = ProductionPreflightGuard.runPreflight(payload, now, true);

  assert(report.passed, 'Preflight: Los 30 checks de preflight productivo pasaron exitosamente');
  assert(report.checks.length === 30, 'Preflight: Exactamente 30 checks auditados');
  assert(report.failedCount === 0, 'Preflight: failedCount = 0');

  return { passed, failed, errors };
}
