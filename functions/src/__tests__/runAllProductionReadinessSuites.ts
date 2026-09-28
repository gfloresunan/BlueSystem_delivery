/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — MASTER GLOBAL REGRESSION RUNNER (C2D.7)
 * Executes all suites: C2C.2, C2D.2, C2D.3, C2D.4, C2D.5, C2D.6, C2D.7 (PR + ATK)
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */

import { runMembershipV3Tests } from './membershipV3Domain.test';
import { runMultiBrandCoreNormalizationTests } from './multiBrandCoreNormalization.test';
import { runEntitlementGatekeeperTests } from './entitlementGatekeeper.test';
import { runAutomatedTenantProvisioningTests } from './automatedTenantProvisioning.test';
import { runWhiteLabelDynamicEngineTests } from './whiteLabelDynamicEngine.test';
import { runCoreIntegrationCertificationTests } from './coreIntegrationCertification.test';
import { runProductionReadinessCertificationTests } from './productionReadinessCertification.test';
import { runSecurityAttackMatrixTests, printAttackMatrix } from './securityAttackMatrix.test';

async function runAll() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║      BLUE SYSTEM DELIVERY ENTERPRISE — GLOBAL PRODUCTION READINESS SUITE    ║');
  console.log('║    C2C.2 + C2D.2 + C2D.3 + C2D.4 + C2D.5 + C2D.6 + C2D.7 (PR+ATK)         ║');
  console.log('║             ONE CORE / ONE CODEBASE / ZERO FORKS / ZERO-PRODUCTION           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults: { name: string; passed: number; failed: number }[] = [];

  // ── Historical Baseline Suites ──────────────────────────────────────────────

  const resC2C2 = await runMembershipV3Tests();
  totalPassed += resC2C2.passed; totalFailed += resC2C2.failed;
  suiteResults.push({ name: 'C2C.2 EIAM Membership V3', ...resC2C2 });

  const resC2D2 = await runMultiBrandCoreNormalizationTests();
  totalPassed += resC2D2.passed; totalFailed += resC2D2.failed;
  suiteResults.push({ name: 'C2D.2 Domain Normalization & Design Tokens', ...resC2D2 });

  const resC2D3 = await runEntitlementGatekeeperTests();
  totalPassed += resC2D3.passed; totalFailed += resC2D3.failed;
  suiteResults.push({ name: 'C2D.3 Entitlement & Subscription Gatekeeper', ...resC2D3 });

  const resC2D4 = await runAutomatedTenantProvisioningTests();
  totalPassed += resC2D4.passed; totalFailed += resC2D4.failed;
  suiteResults.push({ name: 'C2D.4 Automated Tenant Provisioning & Lifecycle', ...resC2D4 });

  const resC2D5 = await runWhiteLabelDynamicEngineTests();
  totalPassed += resC2D5.passed; totalFailed += resC2D5.failed;
  suiteResults.push({ name: 'C2D.5 White-Label Dynamic Engine & Dynamic UI', ...resC2D5 });

  const resC2D6 = await runCoreIntegrationCertificationTests();
  totalPassed += resC2D6.passed; totalFailed += resC2D6.failed;
  suiteResults.push({ name: 'C2D.6 Core Integration Certification', ...resC2D6 });

  // ── C2D.7 Production Readiness Certification ────────────────────────────────

  const resC2D7_PR = await runProductionReadinessCertificationTests();
  totalPassed += resC2D7_PR.passed; totalFailed += resC2D7_PR.failed;
  suiteResults.push({ name: 'C2D.7 Production Readiness Certification (PR-01–PR-28)', ...resC2D7_PR });

  const resC2D7_ATK = runSecurityAttackMatrixTests();
  totalPassed += resC2D7_ATK.passed; totalFailed += resC2D7_ATK.failed;
  suiteResults.push({ name: 'C2D.7 Security Attack Matrix (ATK-01–ATK-24)', ...resC2D7_ATK });

  printAttackMatrix();

  // ── Global Summary ──────────────────────────────────────────────────────────

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('🏆 RESUMEN EJECUTIVO GLOBAL — PRODUCTION READINESS CERTIFICATION:');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  for (const s of suiteResults) {
    const status = s.failed === 0 ? '🟢 PASS' : '🔴 FAIL';
    console.log(`  ${status} | ${s.name.padEnd(55)} | ${s.passed} Passed, ${s.failed} Failed`);
  }
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`  TOTAL GLOBAL: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (totalFailed > 0) {
    console.log('🔴 RESULT: FAILURE — One or more suites have failed tests.');
    process.exit(1);
  } else {
    console.log('🟢 RESULT: ALL SUITES PASSED');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════');
    console.log('   PHASE 2D.7 — PRODUCTION READINESS CERTIFICATION — COMPLETE');
    console.log('   READINESS ≠ ACTIVATION · CERTIFICATION ≠ AUTHORIZATION');
    console.log('');
    console.log('   🛑 MANDATORY GOVERNANCE STOP');
    console.log('   ACTIVATION_AUTHORIZATION = FALSE');
    console.log('   DEPLOYMENT_AUTHORIZATION = FALSE');
    console.log('   CANARY_ENABLED = false');
    console.log('   KILL_SWITCH = ARMED');
    console.log('══════════════════════════════════════════════════════════════════════════════');
  }
}

runAll();
