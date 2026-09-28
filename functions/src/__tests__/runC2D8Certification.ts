/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PHASE 2D.8 — CONTROLLED ACTIVATION PREPARATION
 * MASTER CERTIFICATION RUNNER
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { runControlledActivationPreparationTests } from './controlledActivationPreparation.test';
import {
  runActivationSecurityMatrixTests,
  printActivationSecurityMatrixSummary,
} from './activationSecurityMatrix.test';
import { ActivationGovernanceGuard } from '../activationPreparation/activationGovernanceGuard';

async function main(): Promise<void> {
  const rMaster = await runControlledActivationPreparationTests();
  const rSec = runActivationSecurityMatrixTests();
  printActivationSecurityMatrixSummary();

  console.log('----------------------------------------------------------------------');
  console.log(`[C2D.8 FINAL SCORECARD] MASTER: ${rMaster.passed} PASS / ${rMaster.failed} FAIL | SEC: ${rSec.passed} PASS / ${rSec.failed} FAIL`);
  console.log('----------------------------------------------------------------------\n');

  console.log(ActivationGovernanceGuard.emitMandatoryGovernanceStop());

  const totalFail = rMaster.failed + rSec.failed;
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[C2D.8 FATAL ERROR]', err);
  process.exit(1);
});
