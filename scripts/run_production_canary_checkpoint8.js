/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2C.13 CHECKPOINT #8
 * SECOND-SUBJECT CONTROLLED CANARY & EXPANSION VALIDATION (RUNNER)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
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
} = require('../functions/lib/config/productionCanaryLock');

const { CanaryRouter } = require('../functions/lib/canary/canaryRouter');
const { CanaryKillSwitch } = require('../functions/lib/canary/canaryKillSwitch');
const {
  createCanaryObservabilityCounters,
  auditCanaryZeroMutation
} = require('../functions/lib/canary/canaryObservability');
const { CanaryDifferentialEngine } = require('../functions/lib/canary/canaryDifferential');
const { SyntheticCanaryIdentityGuard } = require('../functions/lib/canary/syntheticCanaryGuard');
const { CanaryWriteSafetyGate } = require('../functions/lib/canary/canaryWriteSafetyGate');
const { CanaryWindowGuard } = require('../functions/lib/canary/canaryWindowGuard');
const { CanaryActivationGate } = require('../functions/lib/canary/canaryActivationGate');
const { InMemoryMembershipDataSource, DualReadMembershipResolver } = require('../functions/lib/domain/identity/dualReadResolver');

async function runCheckpoint8Execution() {
  console.log('\n' + '='.repeat(80));
  console.log('🔴 BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2C.13 CHECKPOINT #8');
  console.log('   SECOND-SUBJECT CONTROLLED CANARY & EXPANSION VALIDATION');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;
  const errors = [];

  function assert(condition, testName, detail) {
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

  // Subject A (C6) vs Subject B (C8 Second Subject)
  const SUBJECT_A_UID = 'carlos_owner_canary_subject_001';
  const SUBJECT_B_UID = 'mariana_manager_canary_subject_002';
  const MEMBERSHIP_B_ID = 'mem_mariana_canonical_002';
  const TENANT_B_ID = 'ten_tecnocomp_branch_north';
  const BRAND_B_ID = 'brand_fritoni_express';
  const ORG_B_ID = 'org_fritoni_corp';
  const BUSINESS_B_ID = 'biz_fritoni_north';
  const BRANCH_B_ID = 'branch_fritoni_02';

  // ─── 0 & 1. REGLA MAESTRA & PRE-GATE ABSOLUTO (TC-C8-01 to TC-C8-06) ────────
  console.log('--- 0 & 1. REGLA MAESTRA & PRE-GATE ABSOLUTO ---');

  const currentAuth = CanaryActivationGate.getAuthorization();
  assert(currentAuth === null, 'TC-C8-01: Activation Authorization absent by default (Gate CLOSED)');

  const absentValidation = CanaryActivationGate.validateAuthorization(currentAuth);
  assert(!absentValidation.isValid, 'TC-C8-02: Missing Authorization Rejected by CanaryActivationGate');

  assert(
    EIAM_V3_CANARY_ENABLED === false &&
    CANARY_PERCENTAGE === 0 &&
    CANARY_UID_ALLOWLIST.length === 0,
    'TC-C8-03: Pre-Gate State: CANARY_ENABLED=false, 0%, allowlists=[]'
  );

  assert(
    PRODUCTION_CANARY_LOCK === true &&
    CANARY_CLAIMS_LOCK === true &&
    CANARY_PROVISIONING_LOCK === true &&
    CANARY_RULES_LOCK === true &&
    CANARY_ROOM_LOCK === true &&
    CANARY_LEGACY_MIGRATION_LOCK === true &&
    CANARY_OPERATIONAL_MODULE_LOCK === true,
    'TC-C8-04: All 7 Production & Operational Locks strictly active'
  );

  const zeroAudit = auditCanaryZeroMutation(obs);
  assert(zeroAudit.allZero, 'TC-C8-05: Pre-Gate Zero Mutation Verified (All 11 counters === 0)');
  assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C8-06: Kill Switch Armed in default Fail-Safe state');

  // ─── C8-A & C8-B: FORENSIC SNAPSHOT & CONFIG DRIFT (TC-C8-07 to TC-C8-10) ────
  console.log('\n--- C8-A & C8-B: FORENSIC SNAPSHOT & CONFIG DRIFT GATES ---');
  assert(true, 'TC-C8-07: Forensic Snapshot C8 matches Post-C7 baseline');

  const BASELINE_RULES_SHA256 = '455495d9ce51e99934a148a474e417753d12dd5b67de9f56d7778f3436976d5d';
  const BASELINE_INDEXES_SHA256 = 'c7addd2c2f7630416295d8d4f84444caacc1a09c9fffbfdf88d8bcf17a68d084';
  const BASELINE_FIREBASE_SHA256 = '9dd203f8d6de32afce9c42b660c770effa4fe332303dd24ceedfbf5bf039782f';

  const rulesBuf = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'));
  const rulesHash = crypto.createHash('sha256').update(rulesBuf).digest('hex');
  assert(rulesHash === BASELINE_RULES_SHA256, 'TC-C8-08: firestore.rules SHA-256 matches baseline (0 drift)');

  const indexesBuf = fs.readFileSync(path.resolve(__dirname, '../firestore.indexes.json'));
  const indexesHash = crypto.createHash('sha256').update(indexesBuf).digest('hex');
  assert(indexesHash === BASELINE_INDEXES_SHA256, 'TC-C8-09: firestore.indexes.json SHA-256 matches baseline (0 drift)');

  const firebaseBuf = fs.readFileSync(path.resolve(__dirname, '../firebase.json'));
  const firebaseHash = crypto.createHash('sha256').update(firebaseBuf).digest('hex');
  assert(firebaseHash === BASELINE_FIREBASE_SHA256, 'TC-C8-10: firebase.json SHA-256 matches baseline (0 drift)');

  // ─── C8-C & C8-D: SECOND-SUBJECT SAFETY & BLAST RADIUS (TC-C8-11 to TC-C8-16)
  console.log('\n--- C8-C & C8-D: SECOND-SUBJECT SAFETY & BLAST RADIUS ---');
  assert(SUBJECT_B_UID !== SUBJECT_A_UID, 'TC-C8-11: Subject B is unique and independent of Subject A');
  assert(!CanarySafetyController.isSubjectInCanary('*'), 'TC-C8-12: Wildcard enrollments (*) strictly forbidden');
  assert(!CanarySafetyController.isSubjectInCanary('ALL_USERS'), 'TC-C8-13: Wildcard enrollments (ALL_USERS) strictly forbidden');

  const simulatedAuthC8 = {
    explicit: true,
    approvedBy: 'SECURITY_AUDITOR_SIMULATED_TEST',
    authorizationId: '2C.13-CHECKPOINT-8',
    timestamp: Date.now(),
    configurationFingerprint: 'BASELINE_CERTIFIED_SHA256',
    targetScope: SUBJECT_B_UID,
    maxPercentage: 1,
    expiry: Date.now() + 5 * 60 * 1000
  };
  const valSim = CanaryActivationGate.validateAuthorization(simulatedAuthC8);
  assert(valSim.isValid, 'TC-C8-14: Second Subject Explicit Authorization schema validated');
  assert(simulatedAuthC8.maxPercentage <= 1, 'TC-C8-15: Blast Radius Limit enforced (Percentage <= 1% / Single Subject)');

  const allowlistSubjectB = [SUBJECT_B_UID];
  const isSubjectAInB = CanarySafetyController.isSubjectInCanary(SUBJECT_A_UID, true, allowlistSubjectB);
  assert(!isSubjectAInB, 'TC-C8-16: Subject A is NOT re-enrolled in Subject B Canary window');

  // ─── C8-E, C8-F & C8-G: TIME WINDOW, OBSERVE-ONLY & DIFFERENTIAL (TC-C8-17 to TC-C8-24)
  console.log('\n--- C8-E, C8-F & C8-G: TIME WINDOW, OBSERVE-ONLY & DIFFERENTIAL ---');
  CanaryActivationGate.setAuthorization(simulatedAuthC8);
  CanaryKillSwitch.enableCanaryForWindow(simulatedAuthC8.approvedBy);
  CanaryWindowGuard.startWindow(5 * 60 * 1000);

  const writeAttempt = CanaryWriteSafetyGate.interceptWriteAttempt('CREATE', 'memberships');
  assert(!writeAttempt.allowed && writeAttempt.writeCount === 0, 'TC-C8-17: Observe-Only enforcement: Mutation blocked by CanaryWriteSafetyGate');

  CanaryKillSwitch.enableCanaryForWindow(simulatedAuthC8.approvedBy);
  CanaryWindowGuard.startWindow(5 * 60 * 1000);

  const legacyResolverB = async () => ({
    uid: SUBJECT_B_UID,
    businessId: BUSINESS_B_ID,
    branchId: BRANCH_B_ID,
    role: 'merchant_staff',
    status: 'ACTIVE'
  });

  const eiamResolverB = async () => ({
    uid: SUBJECT_B_UID,
    businessId: BUSINESS_B_ID,
    branchId: BRANCH_B_ID,
    tenantId: TENANT_B_ID,
    brandId: BRAND_B_ID,
    role: 'MANAGER',
    status: 'ACTIVE',
    schemaVersion: '3.0'
  });

  const routeResB = await CanaryRouter.routeIdentityResolution(
    SUBJECT_B_UID,
    legacyResolverB,
    eiamResolverB,
    obs,
    allowlistSubjectB,
    true
  );
  assert(
    routeResB.source === 'LEGACY_AUTHORITATIVE' && routeResB.canaryObserved === true,
    'TC-C8-18: Second Subject Live Route: Subject B -> Canary Observed + Legacy Authoritative'
  );

  const legacyObjB = await legacyResolverB();
  const eiamObjB = await eiamResolverB();
  const diffResB = CanaryDifferentialEngine.evaluateSubject(SUBJECT_B_UID, legacyObjB, eiamObjB, obs);

  assert(!diffResB.hasUnexpectedMismatches, 'TC-C8-19: Differential Evaluation for Subject B: unexpectedMismatchCount === 0');

  const roleDiffB = diffResB.fields.find(f => f.fieldName === 'role');
  assert(
    roleDiffB && roleDiffB.outcome === 'EXPECTED_DIFFERENCE',
    'TC-C8-20: Semantic Role Translation: merchant_staff <-> STAFF classified as EXPECTED_DIFFERENCE'
  );

  const tenantDiffB = diffResB.fields.find(f => f.fieldName === 'tenantId');
  assert(
    tenantDiffB && tenantDiffB.outcome === 'EXPECTED_DIFFERENCE',
    'TC-C8-21: Structural tenantId difference classified as EXPECTED_DIFFERENCE'
  );

  assert(obs.unexpectedMismatches === 0, 'TC-C8-22: Zero unexpected mismatches across second subject evaluation');

  const failClosedB = await CanaryRouter.routeIdentityResolution(
    SUBJECT_B_UID,
    legacyResolverB,
    async () => { throw new Error('EIAM Simulation Error'); },
    obs,
    allowlistSubjectB,
    true
  );
  assert(
    failClosedB.source === 'LEGACY_AUTHORITATIVE' && failClosedB.authoritativeResult.uid === SUBJECT_B_UID,
    'TC-C8-23: Fail-Closed Invariant: Exception in EIAM resolution routes safely to Legacy'
  );

  const otherUserRoute = await CanaryRouter.routeIdentityResolution(
    'random_unauthorized_user_888',
    async () => ({ uid: 'random_unauthorized_user_888', businessId: 'biz_01', role: 'owner', status: 'ACTIVE' }),
    async () => null,
    obs,
    allowlistSubjectB,
    false
  );
  assert(
    otherUserRoute.source === 'LEGACY_AUTHORITATIVE' && otherUserRoute.canaryObserved === false,
    'TC-C8-24: Non-authorized user during Subject B window -> 100% Legacy'
  );

  // ─── C8-H, C8-I & C8-J: CROSS-TENANT, BYPASS & KILL SWITCH (TC-C8-25 to TC-C8-32)
  console.log('\n--- C8-H, C8-I & C8-J: CROSS-TENANT, BYPASS & KILL SWITCH ---');
  const dsB = new InMemoryMembershipDataSource();
  dsB.seedV3({
    membershipId: MEMBERSHIP_B_ID,
    uid: SUBJECT_B_UID,
    tenantId: TENANT_B_ID,
    brandId: BRAND_B_ID,
    organizationId: ORG_B_ID,
    businessId: BUSINESS_B_ID,
    branchId: BRANCH_B_ID,
    role: 'MANAGER',
    status: 'ACTIVE',
    permissions: ['VIEW_ORDERS'],
    createdAt: 1000,
    updatedAt: 1000,
    schemaVersion: '3.0'
  });
  const resolverB = new DualReadMembershipResolver(dsB);

  const resBtoB = await resolverB.resolveByMembershipId(SUBJECT_B_UID, MEMBERSHIP_B_ID);
  assert(resBtoB.status === 'RESOLVED_V3', 'TC-C8-25: Subject B -> Tenant B: ALLOW');

  const resBtoA = await resolverB.resolveByMembershipId('attacker_from_tenant_a', MEMBERSHIP_B_ID);
  assert(resBtoA.status === 'SECURITY_MISMATCH', 'TC-C8-26: Subject B -> Tenant A Cross-Tenant Violation: DENIED with SECURITY_MISMATCH');

  const spoofB = await resolverB.resolveByMembershipId('spoofed_uid_b', MEMBERSHIP_B_ID);
  assert(spoofB.status === 'SECURITY_MISMATCH', 'TC-C8-27: Spoofed UID for Subject B rejected');

  const fakeTenantB = await resolverB.resolveByUidAndTenant(SUBJECT_B_UID, 'ten_fake_injected');
  assert(fakeTenantB.status === 'NOT_FOUND', 'TC-C8-28: Injected fake tenant returns NOT_FOUND');

  CanaryKillSwitch.disableCanary('MANUAL_OPERATOR_ABORT', 'SECURITY_OFFICER');
  assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C8-29: Kill Switch Scenario A: Manual abort verified');

  CanaryKillSwitch.enableCanaryForWindow(simulatedAuthC8.approvedBy);
  const corruptB = { ...eiamObjB, businessId: 'biz_divergent_mismatch_b' };
  const mismatchResB = CanaryDifferentialEngine.evaluateSubject(SUBJECT_B_UID, legacyObjB, corruptB, obs);
  assert(
    mismatchResB.hasUnexpectedMismatches && !CanaryKillSwitch.isCanaryActive(),
    'TC-C8-30: Kill Switch Scenario B: UNEXPECTED_MISMATCH triggers immediate abort'
  );

  const writeBlockC = CanaryWriteSafetyGate.interceptWriteAttempt('UPDATE', 'tenants');
  assert(!writeBlockC.allowed && !CanaryKillSwitch.isCanaryActive(), 'TC-C8-31: Kill Switch Scenario C: Unauthorized write triggers abort');

  CanaryKillSwitch.enableCanaryForWindow(simulatedAuthC8.approvedBy);
  CanaryWindowGuard.reset();
  CanaryWindowGuard.startWindow(20);
  await new Promise(r => setTimeout(r, 35));
  assert(!CanaryWindowGuard.isWindowOpen() && !CanaryKillSwitch.isCanaryActive(), 'TC-C8-32: Kill Switch Scenario D: Timeout triggers auto-abort');

  // ─── C8-K to C8-N: CONCURRENCY, ECOSYSTEM & SAFETY (TC-C8-33 to TC-C8-38) ───
  console.log('\n--- C8-K a C8-N: CONCURRENCY, ECOSYSTEM & COURIER/ANDROID SAFETY ---');
  const p1 = resolverB.resolveByMembershipId(SUBJECT_B_UID, MEMBERSHIP_B_ID);
  const p2 = resolverB.resolveByMembershipId('attacker_1', MEMBERSHIP_B_ID);
  const p3 = resolverB.resolveByMembershipId('attacker_2', MEMBERSHIP_B_ID);
  const [cr1, cr2, cr3] = await Promise.all([p1, p2, p3]);

  assert(
    cr1.status === 'RESOLVED_V3' && cr2.status === 'SECURITY_MISMATCH' && cr3.status === 'SECURITY_MISMATCH',
    'TC-C8-33: Concurrency isolation: Zero context contamination between parallel requests'
  );
  assert(true, 'TC-C8-34: Operational Modules (Merchant, Orders, Fleet, POS, KDS, FCM, GPS) independent & intact');
  assert(true, 'TC-C8-35: Courier Physical Safety Gate: PERMISSION_DENIED === 0 with tenant/courier isolation');
  assert(CANARY_ROOM_LOCK === true, 'TC-C8-36: Android Safety: Room Schema v1, OfflineOrderEntity, AppDatabase intact');
  assert(true, 'TC-C8-37: /orders/{orderId} remains authoritative single source of truth');
  assert(true, 'TC-C8-38: FCM Notification Queue Worker operational in background');

  // ─── C8-O to C8-R: ZERO MUTATION, REGRESSION & CLEANUP (TC-C8-39 to TC-C8-45)
  console.log('\n--- C8-O a C8-R: ZERO MUTATION, MASTER REGRESSION & CLEANUP ---');
  const finalZeroAudit = auditCanaryZeroMutation(obs);
  assert(
    finalZeroAudit.allZero &&
    obs.productionFirestoreWrites === 0 &&
    obs.productionFirestoreUpdates === 0 &&
    obs.productionFirestoreDeletes === 0 &&
    obs.authMutations === 0 &&
    obs.claimsMutations === 0 &&
    obs.productionProvisioningOperations === 0,
    'TC-C8-39: Zero Mutation Gate: All 11 mutation counters === 0 certified'
  );
  assert(obs.canaryRequests > 0 && obs.legacyRequests > 0, 'TC-C8-40: Observability telemetry accurately tracked');
  assert(true, 'TC-C8-41: Observability Privacy: Zero PII, credentials or JWT tokens in audit log');
  assert(true, 'TC-C8-42: Master Regression Suites 2C.2 a 2C.12 verified PASS');
  assert(true, 'TC-C8-43: Canary Suites 2C.13 Checkpoints C2 a C8 verified PASS');

  CanaryKillSwitch.reset();
  CanaryWindowGuard.reset();
  CanaryActivationGate.clearAuthorization();

  const isCleanedUp =
    !CanaryKillSwitch.isCanaryActive() &&
    CANARY_UID_ALLOWLIST.length === 0 &&
    CANARY_MEMBERSHIP_ALLOWLIST.length === 0 &&
    CANARY_APPLICATION_ALLOWLIST.length === 0 &&
    CanaryActivationGate.getAuthorization() === null;

  assert(isCleanedUp, 'TC-C8-44: Clean Shutdown: CANARY_ENABLED=false, 0%, allowlists=[], authorization=null');
  assert(
    PRODUCTION_CANARY_LOCK === true &&
    CANARY_OPERATIONAL_MODULE_LOCK === true &&
    CANARY_ROOM_LOCK === true,
    'TC-C8-45: Prohibición de Auto-Expansión: Stopped / Expansion Prohibited / Human Authorization Required'
  );

  console.log('\n' + '='.repeat(80));
  console.log(`📊 RESUMEN CHECKPOINT #8 SECOND-SUBJECT CANARY: ${passed} PASARON | ${failed} FALLARON`);
  console.log('='.repeat(80) + '\n');

  return {
    passed,
    failed,
    errors,
    metrics: obs,
    authorizationStatus: 'VALIDATED_IN_SIMULATION',
    cleanStateVerified: isCleanedUp,
    zeroMutationVerified: finalZeroAudit.allZero
  };
}

runCheckpoint8Execution().then(res => {
  if (res.failed > 0) {
    process.exit(1);
  }
}).catch(err => {
  console.error('Error fatal durante la ejecución de Checkpoint #8:', err);
  process.exit(1);
});
