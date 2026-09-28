/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 MASTER STAGING TEST SUITE (FASE 2C.12)
 * Suite Maestra de Validación en Staging & Shadow Run
 */

import { createObservabilityCounters, generateObservabilityReport } from '../../staging/observabilityEngine';
import { runShadowRun, ShadowRunResult } from '../../staging/shadowRunEngine';
import {
  runCrossTenantAdversarialGate,
  runFailureInjectionGate,
  runNetworkFailureSimulation,
  runConcurrencyGate
} from '../../staging/adversarialGate';
import { runWebShadowGate } from '../../staging/webShadowGate';
import { runAndroidShadowGate } from '../../staging/androidShadowGate';
import { runDifferentialEngine } from '../../staging/differentialEngine';
import { runOperationalRegressionGate } from '../../staging/operationalRegressionGate';
import { runSecurityIncidentSimulation } from '../../staging/securityIncidentSimulator';
import { runStagingCleanupAndRollback } from '../../staging/stagingCleanup';
import {
  STAGING_ONLY_LOCK,
  SHADOW_RUN_ONLY,
  REAL_CLAIMS_LOCK,
  PRODUCTION_TRAFFIC_LOCK,
  PRODUCTION_DATA_READ_LOCK,
  PRODUCTION_PROVISIONING_LOCK,
  AUTH_CLAIMS_LOCK,
  FIRESTORE_PRODUCTION_LOCK,
  PRODUCTION_RULES_LOCK,
  ROOM_MIGRATION_LOCK,
  LEGACY_DATA_MIGRATION_LOCK,
  OPERATIONAL_MODULE_LOCK
} from '../../config/stagingLock';

export async function runStagingMasterSuite(): Promise<{
  passed: number;
  failed: number;
  results: ShadowRunResult[];
  errors: string[];
}> {
  console.log('\n======================================================================');
  console.log('🧪 EJECUTANDO SUITE MAESTRA STAGING & SHADOW RUN (FASE 2C.12)');
  console.log('======================================================================\n');

  const obs = createObservabilityCounters();
  const allResults: ShadowRunResult[] = [];
  const errors: string[] = [];

  try {
    // 1. Ejecutar Shadow Run principal (Microfases 2C.12-A a 2C.12-K)
    console.log('--- 1. SHADOW RUN PRINCIPAL & PROVISIONING ---');
    const shadowReport = await runShadowRun(obs);
    allResults.push(...shadowReport.results);

    // 2. Adversarial & Security Gates (2C.12-P)
    console.log('--- 2. CROSS-TENANT ADVERSARIAL GATE ---');
    await runCrossTenantAdversarialGate(allResults, obs);

    // 3. Failure Injection Gate (2C.12-Q)
    console.log('--- 3. FAILURE INJECTION GATE ---');
    await runFailureInjectionGate(allResults, obs);

    // 4. Network Failure Simulation (2C.12-R)
    console.log('--- 4. NETWORK FAILURE SIMULATION ---');
    await runNetworkFailureSimulation(allResults, obs);

    // 5. Concurrency Gate (2C.12-S)
    console.log('--- 5. CONCURRENCY & RACE CONDITIONS GATE ---');
    await runConcurrencyGate(allResults, obs);

    // 6. Merchant Web Shadow Gate (2C.12-L, 2C.12-M)
    console.log('--- 6. MERCHANT WEB SHADOW GATE ---');
    await runWebShadowGate(allResults, obs);

    // 7. Android Shadow Gate (2C.12-N, 2C.12-O)
    console.log('--- 7. ANDROID SHADOW GATE ---');
    await runAndroidShadowGate(allResults, obs);

    // 8. Differential Master Matrix (2C.12-W)
    console.log('--- 8. DIFFERENTIAL MASTER MATRIX ---');
    const diffReport = await runDifferentialEngine(allResults, obs);
    if (diffReport.hasUnexpectedMismatches) {
      throw new Error(`Differential Matrix tiene mismatches inesperados: ${JSON.stringify(diffReport.unexpectedMismatches)}`);
    }

    // 9. Operational Module Regression (2C.12-X)
    console.log('--- 9. OPERATIONAL MODULE REGRESSION GATE ---');
    await runOperationalRegressionGate(allResults, obs);

    // 10. Security Incident Simulation (2C.12-AC)
    console.log('--- 10. SECURITY INCIDENT SIMULATION ---');
    await runSecurityIncidentSimulation(allResults, obs);

    // 11. Staging Cleanup & Rollback (2C.12-AA, 2C.12-AB)
    console.log('--- 11. STAGING CLEANUP & ROLLBACK GATE ---');
    await runStagingCleanupAndRollback(allResults, obs);

    // 12. Validar Locks Globales
    console.log('--- 12. AUDITORÍA DE LOCKS DE GOBERNANZA ---');
    const locksOk =
      STAGING_ONLY_LOCK === true &&
      SHADOW_RUN_ONLY === true &&
      REAL_CLAIMS_LOCK === true &&
      PRODUCTION_TRAFFIC_LOCK === true &&
      PRODUCTION_DATA_READ_LOCK === true &&
      PRODUCTION_PROVISIONING_LOCK === true &&
      AUTH_CLAIMS_LOCK === true &&
      FIRESTORE_PRODUCTION_LOCK === true &&
      PRODUCTION_RULES_LOCK === true &&
      ROOM_MIGRATION_LOCK === true &&
      LEGACY_DATA_MIGRATION_LOCK === true &&
      OPERATIONAL_MODULE_LOCK === true;

    allResults.push({
      phase: 'GOVERNANCE-LOCKS-VERIFICATION',
      success: locksOk,
      detail: 'Verificación Física de Locks: Todos los 12 Locks de Producción están ACTIVOS (TRUE).'
    });

    // 13. Zero-Mutation Audit
    console.log('--- 13. AUDITORÍA ZERO-MUTATION ---');
    const obsReport = generateObservabilityReport(obs);
    allResults.push({
      phase: 'ZERO-MUTATION-AUDIT',
      success: obsReport.zeroMutationAudit.allZero,
      detail: obsReport.zeroMutationAudit.allZero
        ? 'Zero-Mutation Audit: 100% LIMPIO (Todos los contadores en 0).'
        : `Violaciones de Zero-Mutation: ${obsReport.zeroMutationAudit.violations.join(', ')}`
    });

  } catch (err: any) {
    console.error('Error fatal durante la Suite Maestra de Staging:', err);
    errors.push(err.message || String(err));
    allResults.push({
      phase: 'FATAL_ERROR',
      success: false,
      detail: `Fatal Exception: ${err.message || String(err)}`
    });
  }

  // Imprimir resumen
  let passed = 0;
  let failed = 0;

  for (const r of allResults) {
    if (r.success) {
      passed++;
      console.log(`  ✅ PASS: [${r.phase}] ${r.detail}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: [${r.phase}] ${r.detail}`);
      errors.push(`[${r.phase}] ${r.detail}`);
    }
  }

  console.log('\n======================================================================');
  console.log(`📊 RESUMEN STAGING MASTER SUITE: ${passed} PASARON | ${failed} FALLARON`);
  console.log('======================================================================\n');

  return { passed, failed, results: allResults, errors };
}

// Auto-ejecución si se corre directamente
if (require.main === module) {
  runStagingMasterSuite().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
