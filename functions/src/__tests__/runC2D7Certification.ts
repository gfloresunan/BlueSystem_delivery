import { runProductionReadinessCertificationTests } from './productionReadinessCertification.test';
import { runSecurityAttackMatrixTests, printAttackMatrix } from './securityAttackMatrix.test';

async function main(): Promise<void> {
  const r1 = await runProductionReadinessCertificationTests();
  const r2 = runSecurityAttackMatrixTests();
  printAttackMatrix();
  console.log(`[C2D.7 FINAL] PR: ${r1.passed} PASS / ${r1.failed} FAIL | ATK: ${r2.passed} PASS / ${r2.failed} FAIL`);
  const totalFail = r1.failed + r2.failed;
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
