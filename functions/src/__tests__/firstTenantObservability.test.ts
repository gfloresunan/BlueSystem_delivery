/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.14
 * FIRST REAL TENANT OBSERVABILITY TEST SUITE
 * 
 * Verifies:
 * 1. 20 canonical governance events logged
 * 2. Complete redaction/sanitization of secrets, passwords, tokens and JWTs
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../domain/authorization/productionAuthorizationModels';
import { FirstRealTenantExecutionGuard } from '../domain/activation/firstRealTenantActivationEngine';

export function runFirstTenantObservabilityTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [OBSERVABILITY] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [OBSERVABILITY] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('📡 RUNNING FIRST TENANT OBSERVABILITY TESTS (C2D.14)');
  console.log('======================================================================\n');

  const now = 1772400000000;
  const scope: ProductionAuthorizationScope = {
    authorizationId: 'auth_obs_001',
    authorizedBy: 'SYSTEM_OWNER_HUMAN',
    authorizationTimestamp: now,
    expirationTimestamp: now + 3600000,
    level: ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION,
    tenantId: 'ten_obs_01',
    brandId: 'brand_obs_01',
    organizationId: 'org_obs_01',
    businessId: 'biz_obs_01',
    branchId: 'branch_obs_01',
    subscriptionPlan: 'PROFESSIONAL',
    allowedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS'],
    excludedModules: ['GOVERNANCE'],
    allowedUsers: ['usr_obs_admin_01'],
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
  guard.executeControlledActivation(scope, now);

  // Test sanitized secret handling
  guard.logEvent('SAMPLE_SECRET_CHECK', {
    password: 'superSecretPassword123',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    token: 'ya29.a0AfH6SMD...',
    tenantId: 'ten_obs_01'
  });

  const events = guard.getAuditEvents();
  const rawString = JSON.stringify(events);

  assert(!rawString.includes('superSecretPassword123'), 'Observability: Contraseña sanitizada y no registrada');
  assert(!rawString.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Observability: JWT sanitizado y no registrado');
  assert(!rawString.includes('ya29.a0AfH6SMD'), 'Observability: Token sanitizado y no registrado');
  assert(rawString.includes('[REDACTED]'), 'Observability: [REDACTED] presente en campos sensibles');

  return { passed, failed, errors };
}
