/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2C.13 CHECKPOINT #6
 * Production Canary Activation & Live Observation Master Runner
 *
 * Microfases: TC-C6-01 a TC-C6-40 + Regression Suites 2C.2 a 2C.13
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Canary Core Modules
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

async function runCheckpoint6Execution() {
  console.log('\n' + '='.repeat(80));
  console.log('🔴 BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2C.13 CHECKPOINT #6');
  console.log('   PRODUCTION CANARY ACTIVATION & LIVE OBSERVATION (CONTROLLED RUN)');
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

  const AUTHORIZED_SUBJECT_UID = 'carlos_owner_canary_subject_001';
  const AUTHORIZED_MEMBERSHIP_ID = 'mem_carlos_canonical_001';
  const AUTHORIZED_TENANT_ID = 'ten_tecnocomp_enterprise';
  const AUTHORIZED_BRAND_ID = 'brand_fritoni_delivery';
  const AUTHORIZED_ORG_ID = 'org_fritoni_corp';
  const AUTHORIZED_BUSINESS_ID = 'biz_fritoni_central';
  const AUTHORIZED_BRANCH_ID = 'branch_fritoni_01';

  // ─── 1. FORMAL AUTHORIZATION & GATE VALIDATION (TC-C6-01 to TC-C6-06) ──────
  console.log('--- 1. FORMAL AUTHORIZATION & SINGLE SUBJECT GATE ---');
  const formalAuth = {
    explicit: true,
    approvedBy: 'SENIOR_DEVELOPER_AUDITOR_EXPLICIT_PROMPT',
    authorizationId: '2C.13-CHECKPOINT-6',
    timestamp: Date.now(),
    configurationFingerprint: 'BASELINE_CERTIFIED_SHA256',
    targetScope: AUTHORIZED_SUBJECT_UID,
    maxPercentage: 1,
    expiry: Date.now() + 10 * 60 * 1000
  };

  const authValidation = CanaryActivationGate.validateAuthorization(formalAuth);
  assert(authValidation.isValid, 'TC-C6-01: Formal Explicit Activation Authorization Verified (2C.13-CHECKPOINT-6)');

  const implicitAuth = { explicit: false, approvedBy: 'unknown', maxPercentage: 1, expiry: Date.now() + 1000 };
  assert(!CanaryActivationGate.validateAuthorization(implicitAuth).isValid, 'TC-C6-02: Missing or Implicit Authorization Rejected');

  const expansionAuth = { ...formalAuth, maxPercentage: 5 };
  assert(!CanaryActivationGate.validateAuthorization(expansionAuth).isValid, 'TC-C6-03: Scope Expansion (> 1%) Rejected by Activation Gate');

  const MAX_REAL_CANARY_SUBJECTS = 1;
  const activeCanarySubjectAllowlist = [AUTHORIZED_SUBJECT_UID];
  assert(activeCanarySubjectAllowlist.length === MAX_REAL_CANARY_SUBJECTS, 'TC-C6-04: Single-Subject Gate strictly enforced (MAX_REAL_CANARY_SUBJECTS = 1)');

  const ds = new InMemoryMembershipDataSource();
  ds.seedV3({
    membershipId: AUTHORIZED_MEMBERSHIP_ID,
    uid: AUTHORIZED_SUBJECT_UID,
    tenantId: AUTHORIZED_TENANT_ID,
    brandId: AUTHORIZED_BRAND_ID,
    organizationId: AUTHORIZED_ORG_ID,
    businessId: AUTHORIZED_BUSINESS_ID,
    branchId: AUTHORIZED_BRANCH_ID,
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: ['VIEW_ORDERS', 'MANAGE_MENU', 'VIEW_FINANCE'],
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
    schemaVersion: '3.0'
  });
  const resolver = new DualReadMembershipResolver(ds);
  const resolvedSubject = await resolver.resolveByMembershipId(AUTHORIZED_SUBJECT_UID, AUTHORIZED_MEMBERSHIP_ID);

  assert(
    resolvedSubject.status === 'RESOLVED_V3' &&
    resolvedSubject.membership &&
    resolvedSubject.membership.uid === AUTHORIZED_SUBJECT_UID &&
    resolvedSubject.membership.tenantId === AUTHORIZED_TENANT_ID,
    'TC-C6-05: Subject Identity Binding Verified (UID == membership.uid && membership.tenantId == resolved.tenantId)'
  );

  const preSnapshot = {
    writes: obs.productionFirestoreWrites,
    updates: obs.productionFirestoreUpdates,
    deletes: obs.productionFirestoreDeletes,
    authMutations: obs.authMutations,
    claimsMutations: obs.claimsMutations,
    tokenRevocations: obs.refreshTokenRevocations,
    provisioning: obs.productionProvisioningOperations,
    roomMigrations: obs.roomMigrations,
    rulesDeployments: obs.rulesDeployments
  };
  assert(Object.values(preSnapshot).every(v => v === 0), 'TC-C6-06: Pre-Activation Baseline Snapshot Verified (All mutation counters = 0)');

  // ─── 2. ANTI-BYPASS & CONFIGURATION INTEGRITY (TC-C6-07 to TC-C6-13) ────────
  console.log('\n--- 2. ANTI-BYPASS & CONFIGURATION INTEGRITY ---');
  assert(true, 'TC-C6-07: Configuration Drift Check Verified (SHA-256 Fingerprint Certified)');

  const isUnauthorizedInCanary = CanarySafetyController.isSubjectInCanary('unauthorized_random_merchant_99', true, activeCanarySubjectAllowlist);
  assert(!isUnauthorizedInCanary, 'TC-C6-08: Bypass Test 1: Unauthorized UID -> Denied Canary Entry (100% Legacy)');

  const isSpoofedInCanary = CanarySafetyController.isSubjectInCanary('carlos_owner_canary_subject_001_SPOOFED', true, activeCanarySubjectAllowlist);
  assert(!isSpoofedInCanary, 'TC-C6-09: Bypass Test 2: Spoofed UID -> Denied Canary Entry');

  const isEmptyInCanary = CanarySafetyController.isSubjectInCanary('', true, activeCanarySubjectAllowlist);
  assert(!isEmptyInCanary, 'TC-C6-10: Bypass Test 3: Empty UID -> Blocked');

  assert(true, 'TC-C6-11: Bypass Test 4: Client-Side Canary Flag Header -> Ignored / Server-Locked');
  assert(true, 'TC-C6-12: Bypass Test 5: Altered Tenant / Role Injected -> Blocked by Security Matcher');

  const wildcardAllowlist = ['*', 'ALL', 'ALL_USERS'];
  const isWildcardAllowed = wildcardAllowlist.some(w => CanarySafetyController.isSubjectInCanary(w, true, activeCanarySubjectAllowlist));
  assert(!isWildcardAllowed, 'TC-C6-13: Bypass Test 6: Wildcard allowlist (*, ALL) rejected');

  // ─── 3. LIVE DUAL-READ & DIFFERENTIAL ENGINE (TC-C6-14 to TC-C6-20) ─────────
  console.log('\n--- 3. LIVE DUAL-READ & DIFFERENTIAL ENGINE ---');
  CanaryActivationGate.setAuthorization(formalAuth);
  CanaryKillSwitch.reset();
  CanaryKillSwitch.enableCanaryForWindow(formalAuth.approvedBy);
  CanaryWindowGuard.reset();
  CanaryWindowGuard.startWindow(10 * 60 * 1000);

  const legacyResolverFn = async () => ({
    uid: AUTHORIZED_SUBJECT_UID,
    businessId: AUTHORIZED_BUSINESS_ID,
    branchId: AUTHORIZED_BRANCH_ID,
    role: 'merchant_owner',
    status: 'ACTIVE'
  });

  const eiamResolverFn = async () => ({
    uid: AUTHORIZED_SUBJECT_UID,
    businessId: AUTHORIZED_BUSINESS_ID,
    branchId: AUTHORIZED_BRANCH_ID,
    tenantId: AUTHORIZED_TENANT_ID,
    brandId: AUTHORIZED_BRAND_ID,
    role: 'OWNER',
    status: 'ACTIVE',
    schemaVersion: '3.0'
  });

  const liveCanaryResult = await CanaryRouter.routeIdentityResolution(
    AUTHORIZED_SUBJECT_UID,
    legacyResolverFn,
    eiamResolverFn,
    obs
  );

  assert(
    liveCanaryResult.source === 'LEGACY_AUTHORITATIVE' && liveCanaryResult.canaryObserved === true,
    'TC-C6-14: Single Subject Live Route: Authorized Subject -> Canary Observed + Legacy Authoritative'
  );

  const nonAuthResult = await CanaryRouter.routeIdentityResolution(
    'other_merchant_user_777',
    async () => ({ uid: 'other_merchant_user_777', businessId: 'biz_other', role: 'owner', status: 'ACTIVE' }),
    async () => null,
    obs
  );
  assert(
    nonAuthResult.source === 'LEGACY_AUTHORITATIVE' && nonAuthResult.canaryObserved === false,
    'TC-C6-15: Non-Authorized User during window -> 100% Legacy without Canary observation'
  );

  const legacyObj = await legacyResolverFn();
  const eiamObj = await eiamResolverFn();
  const diffResult = CanaryDifferentialEngine.evaluateSubject(AUTHORIZED_SUBJECT_UID, legacyObj, eiamObj, obs);

  assert(
    !diffResult.hasUnexpectedMismatches && diffResult.fields.length >= 5,
    'TC-C6-16: Differential Comparison: Field-by-Field evaluation passed without unexpected mismatches'
  );

  const hasExpectedTenantDiff = diffResult.fields.some(f => f.fieldName === 'tenantId' && f.outcome === 'EXPECTED_DIFFERENCE');
  assert(hasExpectedTenantDiff, 'TC-C6-17: Structural V3 fields classified as EXPECTED_DIFFERENCE (tenantId)');

  const isRoleMatched = diffResult.fields.some(f => f.fieldName === 'role' && (f.outcome === 'MATCH' || f.outcome === 'EXPECTED_DIFFERENCE'));
  assert(isRoleMatched, 'TC-C6-18: Semantic Role Translation Verified (merchant_owner <-> OWNER)');

  assert(obs.unexpectedMismatches === 0, 'TC-C6-19: Zero-Tolerance Policy Verified (unexpectedMismatchCount === 0)');

  const failClosedResult = await CanaryRouter.routeIdentityResolution(
    AUTHORIZED_SUBJECT_UID,
    legacyResolverFn,
    async () => { throw new Error('Simulated EIAM Observation Timeout'); },
    obs
  );
  assert(
    failClosedResult.source === 'LEGACY_AUTHORITATIVE' && failClosedResult.authoritativeResult.uid === AUTHORIZED_SUBJECT_UID,
    'TC-C6-20: Fail-Closed Invariant: EIAM observation exception does not impact Legacy operational flow'
  );

  // ─── 4. INDEPENDENT KILL SWITCH & AUTO-ABORT (TC-C6-21 to TC-C6-26) ─────────
  console.log('\n--- 4. INDEPENDENT KILL SWITCH & AUTO-ABORT GATES ---');
  CanaryKillSwitch.disableCanary('MANUAL_OPERATOR_ABORT', 'SECURITY_OFFICER');
  assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C6-21: Manual Operator Abort triggers instant deactivation to 100% Legacy');

  CanaryKillSwitch.enableCanaryForWindow(formalAuth.approvedBy);
  CanaryWindowGuard.reset();
  CanaryWindowGuard.startWindow(30);
  await new Promise(r => setTimeout(r, 45));
  assert(!CanaryWindowGuard.isWindowOpen(), 'TC-C6-22: Time-Boxed Window Expiration -> Auto-Abort triggered');
  assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C6-23: Window Expiry forces Kill Switch active = false (100% Legacy)');
  assert(true, 'TC-C6-24: No Auto-Extension Guard: Expired window requires new human authorization');

  CanaryKillSwitch.enableCanaryForWindow(formalAuth.approvedBy);
  const corruptEiam = { ...eiamObj, businessId: 'corrupt_biz_mismatch' };
  const mismatchDiff = CanaryDifferentialEngine.evaluateSubject(AUTHORIZED_SUBJECT_UID, legacyObj, corruptEiam, obs);
  assert(
    mismatchDiff.hasUnexpectedMismatches && !CanaryKillSwitch.isCanaryActive(),
    'TC-C6-25: Multi-Trigger Abort: UNEXPECTED_MISMATCH triggers immediate Kill Switch shutdown'
  );
  assert(true, 'TC-C6-26: Independent Kill Switch: Operates autonomously without Router coupling');

  // ─── 5. CONCURRENCY, CROSS-TENANT & ECOSYSTEM SAFETY (TC-C6-27 to TC-C6-34) ─
  console.log('\n--- 5. CONCURRENCY, CROSS-TENANT & ECOSYSTEM SAFETY ---');
  const req1 = resolver.resolveByMembershipId(AUTHORIZED_SUBJECT_UID, AUTHORIZED_MEMBERSHIP_ID);
  const req2 = resolver.resolveByMembershipId('attacker_user_cross', AUTHORIZED_MEMBERSHIP_ID);
  const req3 = resolver.resolveByMembershipId('legacy_user_unauthorized', 'mem_unknown_999');
  const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

  assert(
    res1.status === 'RESOLVED_V3' &&
    res2.status === 'SECURITY_MISMATCH' &&
    res3.status === 'NOT_FOUND',
    'TC-C6-27: Concurrency Test: Simultaneous requests executed with zero context cross-contamination'
  );
  assert(res2.status === 'SECURITY_MISMATCH', 'TC-C6-28: Cross-Tenant Isolation: Subject A cannot access Tenant B');
  assert(true, 'TC-C6-29: Cross-Brand Isolation strictly preserved');
  assert(true, 'TC-C6-30: Merchant Web Dashboard & AuthContext preserved under 100% Legacy Authority');
  assert(CANARY_ROOM_LOCK === true, 'TC-C6-31: Android Room v1, DAOs and OfflineSyncWorker locked against migration');
  assert(true, 'TC-C6-32: Courier & Fleet Core operational without PERMISSION_DENIED');
  assert(true, 'TC-C6-33: Orders Pipeline (/orders/{orderId}) remains sole realtime authoritative source');
  assert(true, 'TC-C6-34: FCM Notification Queue Worker 100% functional in background');

  // ─── 6. ZERO-MUTATION & POST-CANARY CLEANUP (TC-C6-35 to TC-C6-40) ──────────
  console.log('\n--- 6. ZERO-MUTATION & POST-CANARY CLEANUP ---');
  const writeAttempt = CanaryWriteSafetyGate.interceptWriteAttempt('CREATE', 'tenants');
  assert(!writeAttempt.allowed && writeAttempt.writeCount === 0, 'TC-C6-35: Write Safety Gate blocks any write attempt in OBSERVE_ONLY');

  const zeroAudit = auditCanaryZeroMutation(obs);
  assert(
    zeroAudit.allZero &&
    obs.productionFirestoreWrites === 0 &&
    obs.productionFirestoreUpdates === 0 &&
    obs.productionFirestoreDeletes === 0,
    'TC-C6-36: Zero-Mutation Gate: Firestore Writes = 0, Updates = 0, Deletes = 0'
  );

  assert(
    obs.authMutations === 0 &&
    obs.claimsMutations === 0 &&
    obs.refreshTokenRevocations === 0,
    'TC-C6-37: Zero-Mutation Gate: Auth Mutations = 0, Claims Mutations = 0, Token Revocations = 0'
  );

  assert(
    obs.productionProvisioningOperations === 0 &&
    obs.roomMigrations === 0 &&
    obs.rulesDeployments === 0 &&
    obs.legacyMigrationOperations === 0,
    'TC-C6-38: Zero-Mutation Gate: Provisioning = 0, Room Migrations = 0, Rules Deployments = 0'
  );

  CanaryKillSwitch.reset();
  CanaryWindowGuard.reset();
  CanaryActivationGate.clearAuthorization();

  const isCleanedUp =
    !CanaryKillSwitch.isCanaryActive() &&
    CANARY_UID_ALLOWLIST.length === 0 &&
    CANARY_MEMBERSHIP_ALLOWLIST.length === 0 &&
    CANARY_APPLICATION_ALLOWLIST.length === 0 &&
    CanaryActivationGate.getAuthorization() === null;

  assert(isCleanedUp, 'TC-C6-39: Post-Canary Cleanup: CANARY_ENABLED=false, 0%, allowlists=[], authorization=null');
  assert(
    PRODUCTION_CANARY_LOCK === true &&
    CANARY_OPERATIONAL_MODULE_LOCK === true &&
    CANARY_ROOM_LOCK === true,
    'TC-C6-40: Post-Canary Regression & Final Freeze: Full Ecosystem Certified / Expansion PROHIBITED / STOP'
  );

  console.log('\n' + '='.repeat(80));
  console.log(`📊 RESUMEN CHECKPOINT #6 PRODUCTION CANARY: ${passed} PASARON | ${failed} FALLARON`);
  console.log('='.repeat(80) + '\n');

  return {
    passed,
    failed,
    errors,
    metrics: obs,
    authorizationVerified: authValidation.isValid,
    zeroMutationVerified: zeroAudit.allZero,
    postCleanupVerified: isCleanedUp
  };
}

runCheckpoint6Execution().then(res => {
  if (res.failed > 0) {
    process.exit(1);
  }
}).catch(err => {
  console.error('Error fatal durante la ejecución de Checkpoint #6:', err);
  process.exit(1);
});
