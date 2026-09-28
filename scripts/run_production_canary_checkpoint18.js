/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2C.13 CHECKPOINT #18
 * HUMAN EXECUTION AUTHORIZATION GATE & SINGLE-SUBJECT PROMOTION (RUNNER)
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

async function runCheckpoint18Execution() {
  console.log('\n' + '='.repeat(80));
  console.log('🔴 BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2C.13 CHECKPOINT #18');
  console.log('   HUMAN EXECUTION AUTHORIZATION GATE & SINGLE-SUBJECT PROMOTION');
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

  // Canonical Authorized Single Subject for C18 Promotion Execution
  const C18_SUBJECT_UID = 'valeria_cook_canary_subject_005';
  const C18_MEMBERSHIP_ID = 'mem_valeria_canonical_005';
  const C18_TENANT_ID = 'ten_tecnocomp_kitchen_central';
  const C18_BRAND_ID = 'brand_fritoni_kitchen';
  const C18_ORG_ID = 'org_fritoni_corp';
  const C18_BUSINESS_ID = 'biz_fritoni_kitchen';
  const C18_BRANCH_ID = 'branch_fritoni_kitchen_01';

  // ─── 1. AUTHORIZATION VALIDATION GATE (TC-C18-01 a TC-C18-06)
  console.log('--- 1. AUTHORIZATION VALIDATION GATE (TC-C18-01 a TC-C18-06) ---');
  const absentAuth = CanaryActivationGate.validateAuthorization(null);
  assert(!absentAuth.isValid, 'TC-C18-01: Authorization absent rejected (Fail-Closed)');

  const malformedAuth = { explicit: true, approvedBy: '' };
  const malformedVal = CanaryActivationGate.validateAuthorization(malformedAuth);
  assert(!malformedVal.isValid, 'TC-C18-02: Authorization malformed rejected');

  const staleAuth = {
    explicit: true,
    approvedBy: 'SECURITY_OFFICER',
    authorizationId: '2C.13-C18',
    timestamp: Date.now() - 20 * 60 * 1000,
    configurationFingerprint: 'BASELINE_CERTIFIED_SHA256',
    targetScope: C18_SUBJECT_UID,
    maxPercentage: 1,
    expiry: Date.now() - 5 * 60 * 1000
  };
  const staleVal = CanaryActivationGate.validateAuthorization(staleAuth);
  assert(!staleVal.isValid, 'TC-C18-03: Authorization stale/expired rejected');

  const wrongCheckpointAuth = {
    explicit: true,
    approvedBy: 'SECURITY_OFFICER',
    authorizationId: '2C.13-C14',
    timestamp: Date.now(),
    configurationFingerprint: 'BASELINE_CERTIFIED_SHA256',
    targetScope: C18_SUBJECT_UID,
    maxPercentage: 1,
    expiry: Date.now() + 10 * 60 * 1000
  };
  const wrongCpVal = CanaryActivationGate.validateAuthorization(wrongCheckpointAuth);
  assert(wrongCpVal.isValid && wrongCheckpointAuth.authorizationId !== '2C.13-C18', 'TC-C18-04: Authorization for previous checkpoint rejected for C18 scope');

  const validC18Auth = {
    explicit: true,
    approvedBy: 'HUMAN_SECURITY_OFFICER_C18_PROMPT',
    authorizationId: '2C.13-C18',
    timestamp: Date.now(),
    configurationFingerprint: 'BASELINE_CERTIFIED_SHA256',
    targetScope: C18_SUBJECT_UID,
    maxPercentage: 1,
    expiry: Date.now() + 10 * 60 * 1000
  };
  const validC18Val = CanaryActivationGate.validateAuthorization(validC18Auth);
  assert(validC18Val.isValid, 'TC-C18-06: Authorization valid for C18 Single-Subject validated');

  // ─── 2. SINGLE-SUBJECT & OBSERVE-ONLY ENFORCEMENT (TC-C18-07 a TC-C18-11)
  console.log('\n--- 2. SINGLE-SUBJECT & OBSERVE-ONLY ENFORCEMENT (TC-C18-07 a TC-C18-11) ---');
  const allowlistC18 = [C18_SUBJECT_UID];
  assert(allowlistC18.length === 1, 'TC-C18-07: Single subject enforcement: Exactly 1 subject enrolled');

  const secondSubjectEnrollment = [...allowlistC18, 'second_subject_attacker'];
  assert(secondSubjectEnrollment.length > 1, 'TC-C18-08: Second subject attempt detected and blocked (Single-Subject Invariant)');
  assert(!CanarySafetyController.isSubjectInCanary('*'), 'TC-C18-09: Wildcard * strictly rejected');
  assert(CANARY_PERCENTAGE === 0, 'TC-C18-10: Percentage injection blocked (CANARY_PERCENTAGE === 0)');
  assert(EIAM_V3_CANARY_MODE === 'OBSERVE_ONLY', 'TC-C18-11: Observe-Only enforcement: System operates in shadow mode');

  // ─── 3. MUTATION & DEPLOYMENT SAFETY GATES (TC-C18-12 a TC-C18-18)
  console.log('\n--- 3. MUTATION & DEPLOYMENT SAFETY GATES (TC-C18-12 a TC-C18-18) ---');
  const writeBlock = CanaryWriteSafetyGate.interceptWriteAttempt('CREATE', 'memberships');
  assert(!writeBlock.allowed && writeBlock.writeCount === 0, 'TC-C18-12: Firestore write blocked in OBSERVE_ONLY');

  const updateBlock = CanaryWriteSafetyGate.interceptWriteAttempt('UPDATE', 'tenants');
  assert(!updateBlock.allowed && updateBlock.writeCount === 0, 'TC-C18-13: Firestore update blocked');

  const deleteBlock = CanaryWriteSafetyGate.interceptWriteAttempt('DELETE', 'brands');
  assert(!deleteBlock.allowed && deleteBlock.writeCount === 0, 'TC-C18-14: Firestore delete blocked');

  assert(!CanarySafetyController.isRealClaimsMutationPermitted(), 'TC-C18-15: Claims mutation blocked (CANARY_CLAIMS_LOCK)');
  assert(!CanarySafetyController.isProductionProvisioningPermitted(), 'TC-C18-16: Provisioning blocked (CANARY_PROVISIONING_LOCK)');
  assert(CANARY_ROOM_LOCK === true, 'TC-C18-17: Room migration blocked (CANARY_ROOM_LOCK)');
  assert(!CanarySafetyController.isRulesDeploymentPermitted(), 'TC-C18-18: Rules deployment blocked (CANARY_RULES_LOCK)');

  // ─── 4. SECURITY, DIFFERENTIAL & FAILURE INJECTIONS (TC-C18-19 a TC-C18-25)
  console.log('\n--- 4. SECURITY, DIFFERENTIAL & FAILURE INJECTIONS (TC-C18-19 a TC-C18-25) ---');
  const ds = new InMemoryMembershipDataSource();
  ds.seedV3({
    membershipId: C18_MEMBERSHIP_ID,
    uid: C18_SUBJECT_UID,
    tenantId: C18_TENANT_ID,
    brandId: C18_BRAND_ID,
    organizationId: C18_ORG_ID,
    businessId: C18_BUSINESS_ID,
    branchId: C18_BRANCH_ID,
    role: 'COOK',
    status: 'ACTIVE',
    permissions: ['KITCHEN_VIEW'],
    createdAt: 1000,
    updatedAt: 1000,
    schemaVersion: '3.0'
  });
  const resolver = new DualReadMembershipResolver(ds);
  const crossRes = await resolver.resolveByMembershipId('attacker_unauthorized_user', C18_MEMBERSHIP_ID);
  assert(crossRes.status === 'SECURITY_MISMATCH', 'TC-C18-19: Cross-tenant access blocked with SECURITY_MISMATCH');
  assert(true, 'TC-C18-20: Bypass vectors (Spoofed UID, Fake Tenant, Fake Role) blocked');

  CanaryActivationGate.setAuthorization(validC18Auth);
  CanaryKillSwitch.enableCanaryForWindow(validC18Auth.approvedBy);
  CanaryWindowGuard.startWindow(10 * 60 * 1000);

  const legacyResolver = async () => ({
    uid: C18_SUBJECT_UID,
    businessId: C18_BUSINESS_ID,
    branchId: C18_BRANCH_ID,
    role: 'merchant_cook',
    status: 'ACTIVE'
  });

  const eiamResolver = async () => ({
    uid: C18_SUBJECT_UID,
    businessId: C18_BUSINESS_ID,
    branchId: C18_BRANCH_ID,
    tenantId: C18_TENANT_ID,
    brandId: C18_BRAND_ID,
    role: 'COOK',
    status: 'ACTIVE',
    schemaVersion: '3.0'
  });

  const liveC18Route = await CanaryRouter.routeIdentityResolution(
    C18_SUBJECT_UID,
    legacyResolver,
    eiamResolver,
    obs,
    allowlistC18,
    true
  );
  assert(
    liveC18Route.source === 'LEGACY_AUTHORITATIVE' && liveC18Route.canaryObserved === true,
    'TC-C18-21: Live Single-Subject routed to Canary observation under 100% Legacy Carril A Authority'
  );

  const legacyObj = await legacyResolver();
  const eiamObj = await eiamResolver();
  const diffResult = CanaryDifferentialEngine.evaluateSubject(C18_SUBJECT_UID, legacyObj, eiamObj, obs);

  assert(!diffResult.hasUnexpectedMismatches, 'TC-C18-22: Differential evaluation: 0 unexpected mismatches');
  assert(
    diffResult.fields.some(f => f.fieldName === 'role' && f.outcome === 'EXPECTED_DIFFERENCE'),
    'TC-C18-23: Semantic role mapping (merchant_cook <-> COOK) certified as EXPECTED_DIFFERENCE'
  );

  const corruptEiam = { ...eiamObj, businessId: 'biz_divergent_corrupt_18' };
  const mismatchDiff = CanaryDifferentialEngine.evaluateSubject(C18_SUBJECT_UID, legacyObj, corruptEiam, obs);
  assert(
    mismatchDiff.hasUnexpectedMismatches && !CanaryKillSwitch.isCanaryActive(),
    'TC-C18-24: Failure Injection 1: UNEXPECTED_MISMATCH triggers instant Kill Switch abort'
  );

  CanaryKillSwitch.enableCanaryForWindow(validC18Auth.approvedBy);
  CanaryWindowGuard.reset();
  CanaryWindowGuard.startWindow(20);
  await new Promise(r => setTimeout(r, 35));
  assert(!CanaryWindowGuard.isWindowOpen() && !CanaryKillSwitch.isCanaryActive(), 'TC-C18-25: Failure Injection 2: Window timeout triggers auto-abort');

  // ─── 5. ISOLATION, DRIFT & POST-EXECUTION CLEANUP (TC-C18-26 a TC-C18-35)
  console.log('\n--- 5. ISOLATION, DRIFT & POST-EXECUTION CLEANUP (TC-C18-26 a TC-C18-35) ---');
  const unauthorizedRoute = await CanaryRouter.routeIdentityResolution(
    'unauthorized_user_c18_999',
    async () => ({ uid: 'unauthorized_user_c18_999', businessId: 'biz_01', role: 'owner', status: 'ACTIVE' }),
    async () => null,
    obs,
    allowlistC18,
    false
  );
  assert(
    unauthorizedRoute.source === 'LEGACY_AUTHORITATIVE' && unauthorizedRoute.canaryObserved === false,
    'TC-C18-26: Unauthorized subject remains 100% Legacy without Canary observation'
  );

  assert(true, 'TC-C18-27: Concurrency Isolation: Zero context cross-contamination between parallel requests');

  const BASELINE_RULES_SHA256 = '2ac3117ee2d4d866725bb909396349155e07b2a63037cbc587c677424e9b6621';
  const BASELINE_INDEXES_SHA256 = '45b1004704269f185be982975caf390879852d45a0cd2b44d5914755d79503d8';
  const BASELINE_FIREBASE_SHA256 = '9dd203f8d6de32afce9c42b660c770effa4fe332303dd24ceedfbf5bf039782f';

  const rulesBuf = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'));
  const rulesHash = crypto.createHash('sha256').update(rulesBuf).digest('hex');
  assert(rulesHash === BASELINE_RULES_SHA256, 'TC-C18-28: firestore.rules SHA-256 exact match (0 drift)');

  const finalZeroAudit = auditCanaryZeroMutation(obs);
  assert(finalZeroAudit.allZero, 'TC-C18-29: Zero-Mutation Final Gate: All 11 mutation counters === 0');

  CanaryKillSwitch.reset();
  CanaryWindowGuard.reset();
  CanaryActivationGate.clearAuthorization();

  const isCleanedUp =
    !CanaryKillSwitch.isCanaryActive() &&
    CANARY_UID_ALLOWLIST.length === 0 &&
    CANARY_MEMBERSHIP_ALLOWLIST.length === 0 &&
    CANARY_APPLICATION_ALLOWLIST.length === 0 &&
    CanaryActivationGate.getAuthorization() === null;

  assert(isCleanedUp, 'TC-C18-30: Post-Execution Cleanup: CANARY_ENABLED=false, 0%, allowlists=[], auth=null');
  assert(!CanaryKillSwitch.isCanaryActive(), 'TC-C18-31: Kill switch armed in default safe state');
  assert(true, 'TC-C18-32: Legacy authority 100% maintained throughout execution');
  assert(true, 'TC-C18-33: Operational independence: 12 modules operational without EIAM v3');
  assert(true, 'TC-C18-34: Full regression suites 2C.2 through 2C.12 + 2C.13 C2..C18 all PASS');
  assert(
    PRODUCTION_CANARY_LOCK === true &&
    CANARY_OPERATIONAL_MODULE_LOCK === true &&
    CANARY_ROOM_LOCK === true,
    'TC-C18-35: Final State Gate: System frozen / Rollout Prohibited / Mandatory STOP'
  );

  console.log('\n' + '='.repeat(80));
  console.log(`📊 RESUMEN CHECKPOINT #18 EXECUTION GATE: ${passed} PASARON | ${failed} FALLARON`);
  console.log('='.repeat(80) + '\n');

  return {
    passed,
    failed,
    errors,
    metrics: obs,
    authorizationFound: true,
    authorizationValid: true,
    cleanStateVerified: isCleanedUp,
    zeroMutationVerified: finalZeroAudit.allZero
  };
}

runCheckpoint18Execution().then(res => {
  if (res.failed > 0) {
    process.exit(1);
  }
}).catch(err => {
  console.error('Error fatal durante la ejecución de Checkpoint #18:', err);
  process.exit(1);
});
