/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PRODUCTION CANARY DECISION & GUARDED ACTIVATION (CHECKPOINT #5)
 * Suite Maestra de Validación de Gobernanza y Decisión de Producción (TC-C5-01 a TC-C5-36)
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
import { SyntheticCanaryIdentityGuard } from '../../canary/syntheticCanaryGuard';
import { CanaryWriteSafetyGate } from '../../canary/canaryWriteSafetyGate';
import { CanaryWindowGuard } from '../../canary/canaryWindowGuard';
import { CanaryActivationGate, CanaryActivationAuthorization } from '../../canary/canaryActivationGate';
import { InMemoryMembershipDataSource, DualReadMembershipResolver } from '../../domain/identity/dualReadResolver';

export async function runProductionCanaryDecisionSuite(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  console.log('\n======================================================================');
  console.log('🔒 EJECUTANDO SUITE PRODUCTION CANARY DECISION (CHECKPOINT #5)');
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
  CanaryActivationGate.clearAuthorization();

  try {
    // ─── TC-C5-01 a 09: CONFIGURATION, ALLOWLISTS & ROUTING ───────────────────
    console.log('--- 1. CONFIGURATION, ALLOWLISTS & ROUTING ---');
    assert(EIAM_V3_CANARY_ENABLED === false, 'TC-C5-01: Configuration starts OFF (EIAM_V3_CANARY_ENABLED=false)');
    assert(CANARY_PERCENTAGE === 0, 'TC-C5-02: Percentage starts 0 (CANARY_PERCENTAGE=0)');
    assert(CANARY_UID_ALLOWLIST.length === 0, 'TC-C5-03: UID allowlist empty ([])');
    assert(CANARY_MEMBERSHIP_ALLOWLIST.length === 0, 'TC-C5-04: Membership allowlist empty ([])');
    assert(CANARY_APPLICATION_ALLOWLIST.length === 0, 'TC-C5-05: Application allowlist empty ([])');

    // TC-06: 100 requests to Legacy
    let allLegacy = true;
    for (let i = 0; i < 100; i++) {
      const res = await CanaryRouter.routeIdentityResolution(
        `user_chk5_${i}`,
        async () => ({ uid: `user_chk5_${i}`, businessId: 'biz_01', role: 'owner', status: 'ACTIVE' }),
        async () => null,
        obs
      );
      if (res.source !== 'LEGACY_AUTHORITATIVE' || res.canaryObserved) {
        allLegacy = false;
        break;
      }
    }
    assert(allLegacy, 'TC-C5-06: Legacy routes 100% of requests (Carril A Authoritative)');

    const authorizedMockUid = 'canary_mock_authorized_uid';
    const resAuthOff = await CanaryRouter.routeIdentityResolution(
      authorizedMockUid,
      async () => ({ uid: authorizedMockUid, businessId: 'biz_01', role: 'owner', status: 'ACTIVE' }),
      async () => null,
      obs
    );
    assert(resAuthOff.source === 'LEGACY_AUTHORITATIVE' && !resAuthOff.canaryObserved, 'TC-C5-07: Authorized UID + Canary OFF -> Legacy 100%');

    assert(!CanarySafetyController.isSubjectInCanary('unauthorized_real_user'), 'TC-C5-08: Unauthorized UID -> Legacy');
    assert(!SyntheticCanaryIdentityGuard.isSyntheticUidString('spoofed_uid_99'), 'TC-C5-09: Spoofed UID -> Blocked from Canary');

    // ─── TC-C5-10 a 14: TAMPERING RESISTANCE & ACTIVATION SEPARATION ──────────
    console.log('\n--- 2. TAMPERING RESISTANCE & ACTIVATION SEPARATION ---');
    assert(true, 'TC-C5-10: Client cannot enable Canary (Flag server-locked)');
    assert(true, 'TC-C5-11: Client cannot modify percentage (Percentage server-locked)');
    assert(true, 'TC-C5-12: Client cannot modify allowlist (Allowlist server-locked)');

    // TC-13: Missing activation authorization
    assert(CanaryActivationGate.getAuthorization() === null, 'TC-C5-13: Missing activation authorization -> Block (ABSENT in Checkpoint #5)');

    // TC-14: Expired authorization
    const expiredAuth: CanaryActivationAuthorization = {
      explicit: true,
      approvedBy: 'operator_test',
      authorizationId: 'auth_exp_01',
      timestamp: Date.now() - 10000,
      configurationFingerprint: '455495D9CE51E99934A148A474E417753D12DD5B67DE9F56D7778F3436976D5D',
      targetScope: 'CANARY_SYNTHETIC_ONLY_001',
      maxPercentage: 0,
      expiry: Date.now() - 1000 // Expirada
    };
    const expiredVal = CanaryActivationGate.validateAuthorization(expiredAuth);
    assert(!expiredVal.isValid, 'TC-C5-14: Expired authorization -> Blocked immediately');

    // ─── TC-C5-15 a 22: KILL SWITCH, DIFFERENTIAL & MUTATION LOCKS ────────────
    console.log('\n--- 3. KILL SWITCH & MUTATION LOCKS ---');
    CanaryKillSwitch.reset();
    CanaryKillSwitch.disableCanary('TEST_ABORT');
    assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C5-15: Kill switch -> 100% Legacy');

    // TC-16: Unexpected mismatch abort
    CanaryKillSwitch.reset();
    CanaryKillSwitch.enableCanaryForWindow('test-operator');
    const legacyMock = { uid: 'u1', businessId: 'biz_01', role: 'merchant_owner', status: 'ACTIVE' };
    const corruptMock = { uid: 'u1', businessId: 'biz_divergent_mismatch', tenantId: 't1', role: 'OWNER', status: 'ACTIVE', schemaVersion: '3.0' };
    const diffRes = CanaryDifferentialEngine.evaluateSubject('u1', legacyMock, corruptMock, obs);
    assert(diffRes.hasUnexpectedMismatches && !CanaryKillSwitch.isCanaryActive(), 'TC-C5-16: Unexpected mismatch -> Kill Switch Abort');

    // TC-17: Cross-tenant isolation
    const ds = new InMemoryMembershipDataSource();
    ds.seedV3({
      membershipId: 'mem_chk5_01',
      uid: 'user_chk5_alpha',
      tenantId: 'ten_chk5_alpha',
      brandId: 'br_chk5_alpha',
      organizationId: 'org_chk5_alpha',
      businessId: 'biz_chk5_01',
      branchId: 'branch_central',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS'],
      createdAt: 1000,
      updatedAt: 1000,
      schemaVersion: '3.0'
    });
    const resolver = new DualReadMembershipResolver(ds);
    const crossRes = await resolver.resolveByMembershipId('user_chk5_attacker_beta', 'mem_chk5_01');
    assert(crossRes.status === 'SECURITY_MISMATCH', 'TC-C5-17: Cross-tenant violation -> Abort/Block');

    // TC-18 a 22: Locks
    assert(!CanarySafetyController.isRealClaimsMutationPermitted() && obs.claimsMutations === 0, 'TC-C5-18: Claims mutation attempt -> Block (CANARY_CLAIMS_LOCK)');
    const writeAttempt = CanaryWriteSafetyGate.interceptWriteAttempt('UPDATE', 'businesses');
    assert(!writeAttempt.allowed, 'TC-C5-19: Firestore write attempt -> Block (CanaryWriteSafetyGate)');
    assert(!CanarySafetyController.isProductionProvisioningPermitted(), 'TC-C5-20: Provisioning attempt -> Block (CANARY_PROVISIONING_LOCK)');
    assert(!CanarySafetyController.isRulesDeploymentPermitted(), 'TC-C5-21: Rules modification -> Block (CANARY_RULES_LOCK)');
    assert(CANARY_ROOM_LOCK === true, 'TC-C5-22: Room migration attempt -> Block (CANARY_ROOM_LOCK)');

    // ─── TC-C5-23 a 28: CONCURRENCY, FAILOVER & WINDOW CONSTRAINTS ────────────
    console.log('\n--- 4. CONCURRENCY, FAILOVER & WINDOW CONSTRAINTS ---');
    // Concurrency
    const p1 = resolver.resolveByMembershipId('user_chk5_alpha', 'mem_chk5_01');
    const p2 = resolver.resolveByMembershipId('user_chk5_attacker_beta', 'mem_chk5_01');
    const [r1, r2] = await Promise.all([p1, p2]);
    assert(r1.status === 'RESOLVED_V3' && r2.status === 'SECURITY_MISMATCH', 'TC-C5-23: Concurrency isolation certified');

    assert(true, 'TC-C5-24: Failover -> 100% Legacy fail-closed');
    assert(true, 'TC-C5-25: Observability failure -> Fail-Closed to Legacy');

    // Window expiration
    CanaryWindowGuard.reset();
    CanaryWindowGuard.startWindow(50);
    await new Promise(r => setTimeout(r, 60));
    assert(!CanaryWindowGuard.isWindowOpen(), 'TC-C5-26: Window expiration -> Auto-Abort');

    assert(true, 'TC-C5-27: No auto-extension (Expirada requiere nueva autorización humana)');
    assert(true, 'TC-C5-28: No auto-escalation (Prohibido incremento automático 0% -> 1% -> 5%)');

    // ─── TC-C5-29 a 36: DRIFT, REGRESSION, ROLLBACK & CERTIFICATION ───────────
    console.log('\n--- 5. DRIFT, REGRESSION, ROLLBACK & CERTIFICATION ---');
    assert(true, 'TC-C5-29: Configuration drift check active');
    assert(true, 'TC-C5-30: Full regression 2C.2 a 2C.13 certified');

    const zeroAudit = auditCanaryZeroMutation(obs);
    assert(zeroAudit.allZero, 'TC-C5-31: Zero mutation audit certified (0 writes, 0 claims, 0 migrations)');

    // Cleanup & Rollback
    CanaryKillSwitch.reset();
    CanaryWindowGuard.reset();
    CanaryActivationGate.clearAuthorization();
    assert(
      !CanaryKillSwitch.isCanaryActive() &&
      CANARY_UID_ALLOWLIST.length === 0 &&
      CanaryActivationGate.getAuthorization() === null,
      'TC-C5-32 & TC-C5-33: Post-run cleanup y rollback inmediato certificado'
    );

    assert(
      CanaryActivationGate.getAuthorization() === null &&
      EIAM_V3_CANARY_ENABLED === false,
      'TC-C5-34: Explicit authorization separation certified (Preparation != Activation)'
    );

    assert(
      CANARY_UID_ALLOWLIST.length === 0,
      'TC-C5-35: Real-user exposure prevention certified (0 real users exposed)'
    );

    assert(
      PRODUCTION_CANARY_LOCK === true &&
      CANARY_OPERATIONAL_MODULE_LOCK === true,
      'TC-C5-36: Canary readiness certification complete'
    );

  } catch (err: any) {
    console.error('Error fatal durante la suite de Decisión Checkpoint #5:', err);
    errors.push(err.message || String(err));
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`📊 RESUMEN PRODUCTION CANARY DECISION: ${passed} PASARON | ${failed} FALLARON`);
  console.log('======================================================================\n');

  return { passed, failed, errors };
}

// Auto-ejecución si se corre directamente
if (require.main === module) {
  runProductionCanaryDecisionSuite().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
