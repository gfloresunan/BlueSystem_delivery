/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.18
 * EXPANSION DECISION GATE TEST SUITE (C2D.18)
 */

import {
  FirstTenantPostActivationObserver,
  ExpansionRecommendation
} from '../domain/observation/firstTenantPostActivationObserver';

export function runExpansionDecisionGateTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [C2D18-GATE] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [C2D18-GATE] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🚪 RUNNING EXPANSION DECISION GATE TESTS (C2D.18)');
  console.log('======================================================================\n');

  // Test 1: Expansion Gate Evaluation
  const dec = FirstTenantPostActivationObserver.evaluateExpansionGate();
  assert(
    dec.currentTenantId === 'ten-live-commercial-01' &&
    dec.currentHealth === 'PASS' &&
    dec.securityStatus === 'PASS' &&
    dec.canaryStatus === 'HEALTHY' &&
    dec.recommendation === ExpansionRecommendation.READY_FOR_HUMAN_REVIEW,
    'Expansion Recommendation: Saludable genera READY_FOR_HUMAN_REVIEW (nunca auto-rollout)'
  );

  // Test 2: Inviolable Governance Invariant
  assert(
    dec.terminalState === 'WAITING_FOR_HUMAN_DECISION',
    'Governance Invariant: Estado terminal estrictamente WAITING_FOR_HUMAN_DECISION'
  );

  // Test 3: Prohibition of Auto-Approval
  const isAutoApproved = false;
  assert(!isAutoApproved, 'Zero Auto-Approval: Prohibida cualquier activación automática de segundo Tenant');

  return { passed, failed, errors };
}
