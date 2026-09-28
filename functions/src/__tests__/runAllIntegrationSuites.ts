/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — MASTER INTEGRATION RUNNER (FASE 2D.6)
 * Runs all historical and core integration suites: C2C.2, C2D.2, C2D.3, C2D.4, C2D.5, C2D.6
 */

import { runMembershipV3Tests } from './membershipV3Domain.test';
import { runMultiBrandCoreNormalizationTests } from './multiBrandCoreNormalization.test';
import { runEntitlementGatekeeperTests } from './entitlementGatekeeper.test';
import { runAutomatedTenantProvisioningTests } from './automatedTenantProvisioning.test';
import { runWhiteLabelDynamicEngineTests } from './whiteLabelDynamicEngine.test';
import { runCoreIntegrationCertificationTests } from './coreIntegrationCertification.test';

async function runAll() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       BLUE SYSTEM DELIVERY ENTERPRISE — GLOBAL CORE REGRESSION SUITE        ║');
  console.log('║           C2C.2 + C2D.2 + C2D.3 + C2D.4 + C2D.5 + C2D.6 INTEGRATION         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults: { name: string; passed: number; failed: number }[] = [];

  // 1. C2C.2 Membership V3
  const resC2C2 = await runMembershipV3Tests();
  totalPassed += resC2C2.passed;
  totalFailed += resC2C2.failed;
  suiteResults.push({ name: 'C2C.2 EIAM Membership V3', passed: resC2C2.passed, failed: resC2C2.failed });

  // 2. C2D.2 Domain Normalization & Tokens
  const resC2D2 = await runMultiBrandCoreNormalizationTests();
  totalPassed += resC2D2.passed;
  totalFailed += resC2D2.failed;
  suiteResults.push({ name: 'C2D.2 Domain Normalization & Design Tokens', passed: resC2D2.passed, failed: resC2D2.failed });

  // 3. C2D.3 Gatekeeper & Entitlements
  const resC2D3 = await runEntitlementGatekeeperTests();
  totalPassed += resC2D3.passed;
  totalFailed += resC2D3.failed;
  suiteResults.push({ name: 'C2D.3 Entitlement & Subscription Gatekeeper', passed: resC2D3.passed, failed: resC2D3.failed });

  // 4. C2D.4 Automated Provisioning Pipeline
  const resC2D4 = await runAutomatedTenantProvisioningTests();
  totalPassed += resC2D4.passed;
  totalFailed += resC2D4.failed;
  suiteResults.push({ name: 'C2D.4 Automated Tenant Provisioning & Lifecycle', passed: resC2D4.passed, failed: resC2D4.failed });

  // 5. C2D.5 White-Label Dynamic Engine
  const resC2D5 = await runWhiteLabelDynamicEngineTests();
  totalPassed += resC2D5.passed;
  totalFailed += resC2D5.failed;
  suiteResults.push({ name: 'C2D.5 White-Label Dynamic Engine & Dynamic UI', passed: resC2D5.passed, failed: resC2D5.failed });

  // 6. C2D.6 Core Master Integration Certification
  const resC2D6 = await runCoreIntegrationCertificationTests();
  totalPassed += resC2D6.passed;
  totalFailed += resC2D6.failed;
  suiteResults.push({ name: 'C2D.6 Core Integration Certification Checkpoint #1', passed: resC2D6.passed, failed: resC2D6.failed });

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('🏆 RESUMEN EJECUTIVO DE SUITES GLOBALES:');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  for (const s of suiteResults) {
    const status = s.failed === 0 ? '🟢 PASS' : '🔴 FAIL';
    console.log(`  ${status} | ${s.name.padEnd(50)} | ${s.passed} Passed, ${s.failed} Failed`);
  }
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`  TOTAL GLOBAL: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAll();
