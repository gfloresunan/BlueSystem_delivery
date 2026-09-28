/**
 * PHASE 2D.10: UNIFIED CERTIFICATION & REGRESSION RUNNER
 *
 * Runs:
 * 1. C2D.10 Master Post-Canary Test Suite (26 tests)
 * 2. C2D.10 Security Attack Matrix (20 tests)
 * 3. C2D.9 Master Canary Regression (24 tests)
 * 4. C2D.9 Security Matrix Regression (20 tests)
 * 5. C2D.8 Activation Preparation Regression (35 tests)
 * 6. C2D.8 Security Matrix Regression (20 tests)
 * 7. Post-Canary Governance Scorecard & Mandatory Stop
 */

import { runPostCanaryAuditTests } from './postCanaryAudit.test';
import {
  runPostCanarySecurityAttackMatrixTests,
  printPostCanarySecurityMatrixSummary,
} from './postCanarySecurityAttackMatrix.test';
import { runControlledCanaryActivationTests } from './controlledCanaryActivation.test';
import { runCanarySecurityAttackMatrixTests } from './canarySecurityAttackMatrix.test';
import { runControlledActivationPreparationTests } from './controlledActivationPreparation.test';
import { runActivationSecurityMatrixTests } from './activationSecurityMatrix.test';
import { PostCanaryGovernanceGuard } from '../postCanaryAudit/postCanaryGovernanceGuard';

async function runAllCertification(): Promise<void> {
  console.log('\n======================================================================');
  console.log('🌟 BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.10 CERTIFICATION');
  console.log('   POST-CANARY PRODUCTION DECISION & LIMITED EXPANSION AUTHORIZATION');
  console.log('======================================================================\n');

  // 1. C2D.10 Master Suite
  const c2d10Master = runPostCanaryAuditTests();

  // 2. C2D.10 Security Attack Matrix
  const c2d10Sec = runPostCanarySecurityAttackMatrixTests();
  printPostCanarySecurityMatrixSummary();

  // 3. C2D.9 Master Canary Regression
  const c2d9Master = await runControlledCanaryActivationTests();

  // 4. C2D.9 Security Matrix Regression
  const c2d9Sec = runCanarySecurityAttackMatrixTests();

  // 5. C2D.8 Activation Preparation Regression
  const c2d8Master = await runControlledActivationPreparationTests();

  // 6. C2D.8 Security Matrix Regression
  const c2d8Sec = runActivationSecurityMatrixTests();

  // Summary
  console.log('\n======================================================================');
  console.log('📊 FINAL C2D.10 GLOBAL CERTIFICATION SCORECARD');
  console.log('======================================================================');
  console.log(`  C2D.10 Master Suite:             ${c2d10Master.passed} PASS / ${c2d10Master.failed} FAIL`);
  console.log(`  C2D.10 Security Attack Matrix:   ${c2d10Sec.passed} PASS / ${c2d10Sec.failed} FAIL`);
  console.log(`  C2D.9 Master Regression:         ${c2d9Master.passed} PASS / ${c2d9Master.failed} FAIL`);
  console.log(`  C2D.9 Security Regression:       ${c2d9Sec.passed} PASS / ${c2d9Sec.failed} FAIL`);
  console.log(`  C2D.8 Master Regression:         ${c2d8Master.passed} PASS / ${c2d8Master.failed} FAIL`);
  console.log(`  C2D.8 Security Regression:       ${c2d8Sec.passed} PASS / ${c2d8Sec.failed} FAIL`);
  console.log('----------------------------------------------------------------------');

  const totalFailed =
    c2d10Master.failed +
    c2d10Sec.failed +
    c2d9Master.failed +
    c2d9Sec.failed +
    c2d8Master.failed +
    c2d8Sec.failed;

  const scorecard = PostCanaryGovernanceGuard.buildScorecard({
    postCanaryAudit: c2d10Master.failed === 0 ? 'PASS' : 'FAIL',
    securityMatrix: c2d10Sec.failed === 0 ? 'PASS' : 'FAIL',
    historicalRegression:
      c2d9Master.failed === 0 && c2d8Master.failed === 0 ? 'PASS' : 'FAIL',
  });

  PostCanaryGovernanceGuard.printScorecard(scorecard);
  PostCanaryGovernanceGuard.emitMandatoryGovernanceStop();

  if (totalFailed > 0) {
    console.error(`\n❌ C2D.10 CERTIFICATION FAILED WITH ${totalFailed} TOTAL FAILURES.`);
    process.exit(1);
  } else {
    console.log('\n🟢 C2D.10 CERTIFICATION PASSED WITH 100% SUCCESS ACROSS ALL TEST SUITES.');
    process.exit(0);
  }
}

runAllCertification().catch(err => {
  console.error('Unhandled certification runner error:', err);
  process.exit(1);
});
