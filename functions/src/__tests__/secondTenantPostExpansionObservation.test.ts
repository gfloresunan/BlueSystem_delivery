/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.20
 * SECOND TENANT POST-EXPANSION OPERATIONAL OBSERVATION TEST SUITE (C2D.20)
 */

import {
  SecondTenantPostExpansionObserver,
  ExpansionGateRecommendation
} from '../domain/observation/secondTenantPostExpansionObserver';

export function runSecondTenantPostExpansionObservationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D20-OBS] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D20-OBS] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🔭 RUNNING SECOND TENANT POST-EXPANSION OBSERVATION TESTS (C2D.20)');
  console.log('======================================================================\n');

  // Test 1: Dual Tenant Health Observation
  const dualHealth = SecondTenantPostExpansionObserver.observeDualTenantHealth();
  assert(
    dualHealth.tenant01.isHealthy &&
    dualHealth.tenant02.isHealthy &&
    dualHealth.tenant03Status === 'ABSENT' &&
    dualHealth.crossTenantLeaks === 0 &&
    dualHealth.crossBrandLeaks === 0,
    'Dual Tenant Health: Tenant 01 y Tenant 02 saludables y 100% aislados; Tenant 03 ausente'
  );

  // Test 2: Submodules & Platform Health (Web, Android, Gatekeeper, Legacy)
  const submodules = SecondTenantPostExpansionObserver.observeSubmodules();
  assert(
    submodules.webHealthy &&
    submodules.androidHealthy &&
    submodules.gatekeeperHealthy &&
    submodules.legacyCompatibilityHealthy,
    'Platform & Legacy Health: Web, Android, Gatekeeper y compatibilidad histórica sin regresiones'
  );

  // Test 3: Canary Health Confinement
  assert(
    submodules.canaryHealthy && submodules.killSwitchArmed && submodules.rollbackReady,
    'Canary & Guard Posture: Canary saludable (<= 10 reqs / 1%), Kill Switch ARMED, Rollback READY'
  );

  // Test 4: Tenant 02 17-Dimension Scorecard
  const scorecard = SecondTenantPostExpansionObserver.generateTenant02Scorecard();
  const allScorecardPass = Object.values(scorecard).every(v => v === 'PASS');
  assert(allScorecardPass, 'Tenant 02 Scorecard: Las 17 dimensiones operativas evaluadas en PASS');

  // Test 5: Expansion Decision Gate Evaluation
  const gateDecision = SecondTenantPostExpansionObserver.evaluateExpansionGate();
  assert(
    gateDecision.recommendation === ExpansionGateRecommendation.CONDITIONAL_READY_FOR_HUMAN_AUTHORIZATION &&
    gateDecision.terminalState === 'WAITING_FOR_HUMAN_DECISION' &&
    gateDecision.gatesLocked.rollout === true &&
    gateDecision.gatesLocked.canaryExpansion === true &&
    gateDecision.gatesLocked.tenant03Authorized === false,
    'Expansion Decision Gate: Emite CONDITIONAL_READY_FOR_HUMAN_AUTHORIZATION con gates bloqueados'
  );

  return { passed, failed, errors };
}
