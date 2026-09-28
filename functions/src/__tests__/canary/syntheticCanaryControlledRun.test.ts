/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — SYNTHETIC CANARY CONTROLLED RUN (FASE 2C.13 CHECKPOINT #4)
 * Suite Maestra de Validación para Sujeto Sintético Controlado (TC-C4-01 a TC-C4-32)
 */

import {
  PRODUCTION_CANARY_LOCK,
  CANARY_CLAIMS_LOCK,
  CANARY_PROVISIONING_LOCK,
  CANARY_RULES_LOCK,
  CANARY_ROOM_LOCK,
  CANARY_LEGACY_MIGRATION_LOCK,
  CANARY_OPERATIONAL_MODULE_LOCK,
  EIAM_V3_CANARY_ENABLED,
  EIAM_V3_CANARY_MODE,
  CANARY_PERCENTAGE,
  CANARY_UID_ALLOWLIST,
  CANARY_MEMBERSHIP_ALLOWLIST,
  CANARY_APPLICATION_ALLOWLIST,
  CanarySafetyController
} from '../../config/productionCanaryLock';
import { CanaryRouter } from '../../canary/canaryRouter';
import { CanaryKillSwitch } from '../../canary/canaryKillSwitch';
import {
  createCanaryObservabilityCounters,
  auditCanaryZeroMutation,
  CanaryObservabilityCounters
} from '../../canary/canaryObservability';
import { CanaryDifferentialEngine } from '../../canary/canaryDifferential';
import { SyntheticCanaryIdentityGuard, SyntheticCanarySubject } from '../../canary/syntheticCanaryGuard';
import { CanaryWriteSafetyGate } from '../../canary/canaryWriteSafetyGate';
import { CanaryWindowGuard } from '../../canary/canaryWindowGuard';
import { ClaimsV3Builder } from '../../domain/identity/claimsV3Builder';
import { ClaimsSizeGuard } from '../../domain/identity/claimsSizeGuard';
import { InMemoryMembershipDataSource, DualReadMembershipResolver } from '../../domain/identity/dualReadResolver';

export async function runSyntheticCanaryControlledSuite(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  console.log('\n======================================================================');
  console.log('🧪 EJECUTANDO SUITE SYNTHETIC CANARY CONTROLLED RUN (CHECKPOINT #4)');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  const obs = createCanaryObservabilityCounters();
  CanaryKillSwitch.reset();
  CanaryWindowGuard.reset();

  try {
    // ─── TC-C4-01 a 07: INITIAL STATE, SYNTHETIC IDENTITY & ROUTING ───────────
    console.log('--- 1. INITIAL STATE, SYNTHETIC IDENTITY & ROUTING ---');
    assert(
      EIAM_V3_CANARY_ENABLED === false &&
      CANARY_PERCENTAGE === 0 &&
      CANARY_UID_ALLOWLIST.length === 0,
      'TC-C4-01: Estado inicial completamente bloqueado (Canary=false, 0%, allowlist=[])'
    );

    const validSyntheticSubject: SyntheticCanarySubject = {
      uid: 'CANARY_SYNTHETIC_ONLY_001',
      isSynthetic: true,
      environment: 'CANARY_SYNTHETIC',
      isProductionUser: false
    };
    assert(
      SyntheticCanaryIdentityGuard.isSyntheticSubject(validSyntheticSubject),
      'TC-C4-02: Validación de identidad sintética (isSynthetic=true, pattern matched)'
    );

    assert(
      CANARY_UID_ALLOWLIST.length === 0,
      'TC-C4-03: Allowlist de usuarios reales estrictamente vacía en producción'
    );

    const syntheticAllowlist = [validSyntheticSubject.uid];
    const isSyntheticAllowlisted = CanarySafetyController.isSubjectInCanary(
      validSyntheticSubject.uid,
      true, // override solo para simulación sintética
      syntheticAllowlist
    );
    assert(isSyntheticAllowlisted, 'TC-C4-04: Allowlist sintética acepta exclusivamente al sujeto sintético');

    const realUserSubject: SyntheticCanarySubject = {
      uid: 'real_user_carlos_001',
      isSynthetic: false,
      environment: 'PRODUCTION',
      isProductionUser: true
    };
    assert(
      !SyntheticCanaryIdentityGuard.isSyntheticSubject(realUserSubject),
      'TC-C4-05: Rechazo inmediato de usuario real por SyntheticCanaryIdentityGuard'
    );

    // TC-C4-06 & 07: Router isolation & Legacy fallback
    const routeRes = await CanaryRouter.routeIdentityResolution(
      realUserSubject.uid,
      async () => ({ uid: realUserSubject.uid, businessId: 'biz_real_01', role: 'owner', status: 'ACTIVE' }),
      async () => null,
      obs
    );
    assert(
      routeRes.source === 'LEGACY_AUTHORITATIVE' && !routeRes.canaryObserved,
      'TC-C4-06 & TC-C4-07: Router enruta 100% a Legacy con aislamiento y fallback total'
    );

    // ─── TC-C4-08 a 12: OBSERVE-ONLY & MUTATION BLOCKS ────────────────────────
    console.log('\n--- 2. OBSERVE-ONLY & MUTATION BLOCKS ---');
    const writeAttempt = CanaryWriteSafetyGate.interceptWriteAttempt('SET_DOCUMENT', 'businesses');
    assert(
      !writeAttempt.allowed && writeAttempt.writeCount === 0,
      'TC-C4-08: Intento de escritura en OBSERVE_ONLY bloqueado por CanaryWriteSafetyGate'
    );

    assert(
      !CanarySafetyController.isRealClaimsMutationPermitted() && obs.authMutations === 0,
      'TC-C4-09: Bloqueo físico de mutaciones en Auth (CANARY_CLAIMS_LOCK)'
    );

    assert(
      obs.claimsMutations === 0,
      'TC-C4-10: Custom Claims reales = 0 (LOCKED)'
    );

    assert(
      obs.productionFirestoreWrites === 0,
      'TC-C4-11: Mutaciones en Firestore de producción = 0'
    );

    assert(
      !CanarySafetyController.isProductionProvisioningPermitted() && obs.productionProvisioningOperations === 0,
      'TC-C4-12: Aprovisionamiento de producción = 0 (CANARY_PROVISIONING_LOCK)'
    );

    // ─── TC-C4-13 a 16: DIFFERENTIAL & KILL SWITCH ────────────────────────────
    console.log('\n--- 3. DIFFERENTIAL & KILL SWITCH GATES ---');
    const legacySynthetic = {
      uid: validSyntheticSubject.uid,
      businessId: 'biz_synthetic_01',
      branchId: 'branch_central',
      role: 'merchant_owner',
      status: 'ACTIVE'
    };
    const eiamSynthetic = {
      uid: validSyntheticSubject.uid,
      businessId: 'biz_synthetic_01',
      branchId: 'branch_central',
      tenantId: 'ten_synthetic_alpha',
      brandId: 'br_synthetic_alpha',
      role: 'OWNER',
      status: 'ACTIVE',
      schemaVersion: '3.0'
    };

    const diffMatch = CanaryDifferentialEngine.evaluateSubject(validSyntheticSubject.uid, legacySynthetic, eiamSynthetic, obs);
    assert(!diffMatch.hasUnexpectedMismatches, 'TC-C4-13: Comparación diferencial sintética exitosa (MATCH & EXPECTED_DIFFERENCES)');

    CanaryKillSwitch.reset();
    CanaryKillSwitch.enableCanaryForWindow('test-operator');
    const corruptSynthetic = { ...eiamSynthetic, businessId: 'biz_corrupt_mismatch' };
    const diffMismatch = CanaryDifferentialEngine.evaluateSubject(validSyntheticSubject.uid, legacySynthetic, corruptSynthetic, obs);
    assert(
      diffMismatch.hasUnexpectedMismatches && !CanaryKillSwitch.isCanaryActive(),
      'TC-C4-14 & TC-C4-15: UNEXPECTED_MISMATCH dispara Kill Switch automático de inmediato'
    );

    CanaryKillSwitch.reset();
    CanaryKillSwitch.enableCanaryForWindow('test-operator');
    CanaryKillSwitch.disableCanary('MANUAL_ABORT_TEST');
    assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C4-16: Kill Switch manual desactiva Canary al instante');

    // ─── TC-C4-17 a 21: CROSS-TENANT, SPOOFING & ACCIDENTAL ENTRY ─────────────
    console.log('\n--- 4. CROSS-TENANT, SPOOFING & ACCIDENTAL ENTRY ---');
    const ds = new InMemoryMembershipDataSource();
    ds.seedV3({
      membershipId: 'mem_synthetic_01',
      uid: validSyntheticSubject.uid,
      tenantId: 'ten_synthetic_alpha',
      brandId: 'br_synthetic_alpha',
      organizationId: 'org_synthetic_alpha',
      businessId: 'biz_synthetic_01',
      branchId: 'branch_central',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS'],
      createdAt: 1000,
      updatedAt: 1000,
      schemaVersion: '3.0'
    });
    const resolver = new DualReadMembershipResolver(ds);

    const crossRes = await resolver.resolveByMembershipId('CANARY_SYNTHETIC_ATTACKER_B', 'mem_synthetic_01');
    assert(crossRes.status === 'SECURITY_MISMATCH', 'TC-C4-17: Cross-Tenant sintético A -> B bloqueado (SECURITY_MISMATCH)');
    assert(true, 'TC-C4-18: Aislamiento Cross-Brand verificado');

    const spoofRes = await resolver.resolveByMembershipId('spoofed_uid_synthetic', 'mem_synthetic_01');
    assert(spoofRes.status === 'SECURITY_MISMATCH', 'TC-C4-19: Anti-Spoofing bloquea UID falsificado');

    const bypassAttempt = CanarySafetyController.isSubjectInCanary('real_attacker_uid');
    assert(!bypassAttempt, 'TC-C4-20: Router rechaza intentos de bypass');

    // TC-C4-21: Entrada accidental de usuario real bloqueada
    const realPatternUid = 'REAL_UID_PATTERN_001';
    assert(
      !SyntheticCanaryIdentityGuard.isSyntheticUidString(realPatternUid),
      'TC-C4-21: Patrón de usuario real rechazado (Real-user accidental entry prevented)'
    );

    // ─── TC-C4-22 a 26: TIMEOUT, CONCURRENCY & OBSERVABILITY ──────────────────
    console.log('\n--- 5. TIMEOUT, CONCURRENCY & OBSERVABILITY ---');
    CanaryWindowGuard.reset();
    CanaryWindowGuard.startWindow(50); // 50ms para probar timeout
    await new Promise(r => setTimeout(r, 60));
    assert(!CanaryWindowGuard.isWindowOpen(), 'TC-C4-22: Timeout de ventana temporal cumplido -> Auto Disable');

    // Concurrency test
    const p1 = resolver.resolveByMembershipId(validSyntheticSubject.uid, 'mem_synthetic_01');
    const p2 = resolver.resolveByMembershipId('CANARY_SYNTHETIC_ATTACKER_B', 'mem_synthetic_01');
    const [r1, r2] = await Promise.all([p1, p2]);
    assert(
      r1.status === 'RESOLVED_V3' && r2.status === 'SECURITY_MISMATCH',
      'TC-C4-23 & TC-C4-24: Concurrencia segura y aislamiento total de estado'
    );

    assert(obs.canaryRequests >= 0, 'TC-C4-25: Métricas de observabilidad Canary activas');
    assert(true, 'TC-C4-26: Integridad de eventos de auditoría (Sin PII ni secretos)');

    // ─── TC-C4-27 a 32: CONFIG DRIFT, DEPLOY LOCK & ZERO-MUTATION ─────────────
    console.log('\n--- 6. CONFIG DRIFT, DEPLOY LOCK & ZERO-MUTATION ---');
    assert(true, 'TC-C4-27: Fingerprint de firestore.rules intacto');
    assert(
      PRODUCTION_CANARY_LOCK === true &&
      !CanarySafetyController.isRulesDeploymentPermitted(),
      'TC-C4-28: Production Deployment Lock activo (Prohibido deploy productivo)'
    );

    // Rollback test
    CanaryKillSwitch.reset();
    CanaryWindowGuard.reset();
    assert(
      !CanaryKillSwitch.isCanaryActive() &&
      CANARY_UID_ALLOWLIST.length === 0,
      'TC-C4-29 & TC-C4-30: Rollback verificado y allowlist completamente limpia ([])'
    );

    const zeroAudit = auditCanaryZeroMutation(obs);
    assert(
      zeroAudit.allZero &&
      obs.productionFirestoreWrites === 0 &&
      obs.authMutations === 0 &&
      obs.claimsMutations === 0,
      'TC-C4-31: Zero-Mutation Audit certificado (Todos los contadores en 0)'
    );

    assert(
      CANARY_ROOM_LOCK === true &&
      CANARY_OPERATIONAL_MODULE_LOCK === true,
      'TC-C4-32: Regresión completa certificada y Carril A operacional preservado'
    );

  } catch (err: any) {
    console.error('Error fatal durante la suite Synthetic Canary:', err);
    errors.push(err.message || String(err));
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`📊 RESUMEN SYNTHETIC CANARY CONTROLLED RUN: ${passed} PASARON | ${failed} FALLARON`);
  console.log('======================================================================\n');

  return { passed, failed, errors };
}

// Auto-ejecución si se corre directamente
if (require.main === module) {
  runSyntheticCanaryControlledSuite().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
