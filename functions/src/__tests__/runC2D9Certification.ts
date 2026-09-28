/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PHASE 2D.9 — FIRST CONTROLLED CANARY ACTIVATION
 * MASTER CERTIFICATION RUNNER
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { runControlledCanaryActivationTests } from './controlledCanaryActivation.test';
import {
  runCanarySecurityAttackMatrixTests,
  printCanarySecurityMatrixSummary,
} from './canarySecurityAttackMatrix.test';
import { runControlledActivationPreparationTests } from './controlledActivationPreparation.test';
import { runActivationSecurityMatrixTests } from './activationSecurityMatrix.test';
import { CanaryGovernanceGuard } from '../controlledCanary/canaryGovernanceGuard';

async function main(): Promise<void> {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('🚀 EXECUTING C2D.9 FIRST CONTROLLED CANARY CERTIFICATION');
  console.log('══════════════════════════════════════════════════════════════════════');

  // 1. C2D.9 Master Suite
  const rCanary = await runControlledCanaryActivationTests();

  // 2. C2D.9 Security Attack Matrix (20 Scenarios)
  const rCanarySec = runCanarySecurityAttackMatrixTests();
  printCanarySecurityMatrixSummary();

  // 3. C2D.8 Regression
  console.log('\n--- VERIFYING C2D.8 REGRESSION BASELINE ---');
  const rC2D8 = await runControlledActivationPreparationTests();
  const rC2D8Sec = runActivationSecurityMatrixTests();

  console.log('\n======================================================================');
  console.log('📊 FINAL C2D.9 GLOBAL CERTIFICATION SCORECARD');
  console.log('======================================================================');
  console.log(`  C2D.9 Master Suite:              ${rCanary.passed} PASS / ${rCanary.failed} FAIL`);
  console.log(`  C2D.9 Security Attack Matrix:    ${rCanarySec.passed} PASS / ${rCanarySec.failed} FAIL`);
  console.log(`  C2D.8 Master Regression:         ${rC2D8.passed} PASS / ${rC2D8.failed} FAIL`);
  console.log(`  C2D.8 Security Regression:       ${rC2D8Sec.passed} PASS / ${rC2D8Sec.failed} FAIL`);
  console.log('----------------------------------------------------------------------');

  const totalFail = rCanary.failed + rCanarySec.failed + rC2D8.failed + rC2D8Sec.failed;

  console.log(CanaryGovernanceGuard.emitMandatoryGovernanceStop());

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[C2D.9 FATAL CERTIFICATION ERROR]', err);
  process.exit(1);
});
