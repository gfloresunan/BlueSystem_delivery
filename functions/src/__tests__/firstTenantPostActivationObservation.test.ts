/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.18
 * FIRST TENANT POST-ACTIVATION OBSERVATION TEST SUITE (C2D.18)
 */

import {
  FirstTenantPostActivationObserver
} from '../domain/observation/firstTenantPostActivationObserver';

export function runFirstTenantPostActivationObservationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D18-OBS] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D18-OBS] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🔍 RUNNING FIRST TENANT POST-ACTIVATION OBSERVATION TESTS (C2D.18)');
  console.log('======================================================================\n');

  // Test 1: Tenant Identity & Isolation
  const th = FirstTenantPostActivationObserver.observeTenantHealth();
  assert(
    th.tenantId === 'ten-live-commercial-01' &&
    th.brandId === 'brand-live-commercial-01' &&
    th.administratorUid === 'usr-live-admin-01' &&
    th.isHealthy &&
    th.crossTenantLeaks === 0 &&
    th.crossBrandLeaks === 0,
    'Tenant Health Observation: Primer Tenant saludable y aislado (0 leaks)'
  );

  // Test 2: Submodule Operational Health
  const sm = FirstTenantPostActivationObserver.observeSubmodules();
  assert(
    sm.ordersHealthy &&
    sm.catalogHealthy &&
    sm.customersHealthy &&
    sm.notificationsHealthy &&
    sm.webHealthy &&
    sm.androidHealthy &&
    sm.gatekeeperHealthy,
    'Submodules Observation: Todos los submódulos autorizados operacionales'
  );

  // Test 3: Resilience & Defense Posture
  assert(
    sm.killSwitchArmed &&
    sm.rollbackReady &&
    sm.legacyCompatibilityHealthy,
    'Resilience & Governance Posture: Kill Switch ARMED, Rollback READY, Legacy 100% compatible'
  );

  // Test 4: Drift & Zero Mutation Verification
  assert(
    th.configDrift === 0 &&
    th.rulesDrift === 0 &&
    th.unauthorizedClaimsCount === 0,
    'Drift & Mutation Verification: 0 config drift, 0 rules drift, 0 claims no autorizados'
  );

  return { passed, failed, errors };
}
