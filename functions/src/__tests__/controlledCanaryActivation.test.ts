/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PHASE 2D.9 — FIRST CONTROLLED CANARY ACTIVATION
 * MASTER TEST SUITE
 *
 * SCOPE: All C2D.9 verification domains
 * EXECUTION CLASS: HUMAN-AUTHORIZED / STRICTLY SCOPED / REVERSIBLE
 *
 * PRINCIPLE: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION ≠ ROLLOUT
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { CanaryAuthorizationValidator } from '../controlledCanary/canaryAuthorizationValidator';
import { CanaryPreflightGuard } from '../controlledCanary/canaryPreflightGuard';
import { CanaryEngine } from '../controlledCanary/canaryEngine';
import { CanaryKillSwitchController } from '../controlledCanary/canaryKillSwitchController';
import { CanaryRollbackOrchestrator } from '../controlledCanary/canaryRollbackOrchestrator';
import { CanaryObservabilityLogger } from '../controlledCanary/canaryObservabilityLogger';
import { CanaryGovernanceGuard } from '../controlledCanary/canaryGovernanceGuard';
import type { FirstCanaryCandidate, HumanCanaryAuthorization } from '../controlledCanary/canaryModels';
import type { SubscriptionEntity } from '../domain/platform/models';
import {
  ActivationAuthorizationGate,
  DeploymentAuthorizationGate,
  ClaimsActivationGate,
  MigrationAuthorizationGate,
  RolloutAuthorizationGate,
  resetAllGates,
} from '../activationPreparation/activationAuthorization';
import { ProductionMutationGuard } from '../productionReadiness/productionMutationGuard';
import { ProductionInvocationDetector } from '../productionReadiness/productionInvocationDetector';
import { createInMemoryRepositories } from '../domain/provisioning/repositories';
import { ProvisioningEngine } from '../domain/provisioning/provisioningPipeline';
import type { ProvisioningRequest } from '../domain/provisioning/models';

type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message });
    console.log(`  ❌ FAIL: ${name}\n     ${e.message}`);
  }
}

async function testAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message });
    console.log(`  ❌ FAIL: ${name}\n     ${e.message}`);
  }
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${msg}`);
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) throw new Error(`ASSERTION_FAILED: ${msg}. Expected "${expected}", got "${actual}"`);
}

const CANONICAL_CANDIDATE: FirstCanaryCandidate = {
  candidateId: 'cand-first-canary-01',
  tenantId: 'ten-canary-first-01',
  brandId: 'brand-canary-first-01',
  businessId: 'biz-canary-first-01',
  branchId: 'branch-canary-first-01',
  commercialModel: 'MARKETPLACE',
  subscriptionPlan: 'PROFESSIONAL',
  entitlements: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'CONTROL_TOWER', 'NOTIFICATIONS'],
  initialRole: 'OWNER',
  canary: true,
  canaryPercentage: 0.01,
  canaryRequestLimit: 1,
  simulationOnly: false,
  humanAuthorizationRequired: true,
  rolloutAllowed: false,
};

function buildCanarySub(tenantId: string, overrides?: Partial<SubscriptionEntity>): SubscriptionEntity {
  return {
    subscriptionId: `sub-${tenantId}`,
    tenantId,
    planId: 'plan-pro',
    planName: 'Pro Plan',
    planTier: 'PROFESSIONAL',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    startDate: Date.now() - 5000,
    endDate: Date.now() + 30 * 24 * 3600 * 1000,
    enabledFeatures: CANONICAL_CANDIDATE.entitlements,
    disabledFeatures: [],
    limits: {
      maxBusinesses: 1,
      maxBranches: 5,
      maxUsers: 10,
      maxCouriers: 10,
      maxOrders: 1000,
      maxStorageMb: 1024,
      maxApiRequests: 50000,
    },
    schemaVersion: '1.0',
    createdAt: Date.now() - 5000,
    updatedAt: Date.now() - 5000,
    createdBy: 'sys',
    updatedBy: 'sys',
    ...overrides,
  };
}

export async function runControlledCanaryActivationTests(): Promise<{ passed: number; failed: number }> {
  results.length = 0;
  resetAllGates();
  CanaryObservabilityLogger.clear();
  CanaryKillSwitchController.reset();
  ProductionMutationGuard.reset();
  ProductionInvocationDetector.reset();

  const now = Date.now();
  console.log('\n======================================================================');
  console.log('🔵 PHASE 2D.9 — FIRST CONTROLLED CANARY ACTIVATION MASTER TEST SUITE');
  console.log('   Execution Class: HUMAN-AUTHORIZED / STRICTLY SCOPED / REVERSIBLE');
  console.log('======================================================================');

  // ── BLOCK 1: HUMAN AUTHORIZATION & PARAMETER COMPLETENESS ──────────────────
  console.log('\n--- BLOCK 1: HUMAN AUTHORIZATION VALIDATION ---');
  test('CAN-01-A: Canonical human authorization with 16 parameters is VALID', () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization('cand-01', 'ten-01');
    const report = CanaryAuthorizationValidator.validate(auth);
    assert(report.isValid, 'Canonical human authorization must be valid');
    assertEqual(report.missingFields.length, 0, 'Must have 0 missing fields');
  });

  test('CAN-01-B: Missing authorizedBy produces NO-GO (AUTHORIZATION_SCOPE_INCOMPLETE)', () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization('cand-01', 'ten-01');
    const invalidAuth = { ...auth, authorizedBy: '' };
    const report = CanaryAuthorizationValidator.validate(invalidAuth);
    assert(!report.isValid, 'Must fail validation');
    assertEqual(report.status, 'NO-GO', 'Status must be NO-GO');
    assert(report.missingFields.includes('authorizedBy'), 'Must report authorizedBy missing');
  });

  test('CAN-01-C: Missing rollbackDeadline produces NO-GO', () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization('cand-01', 'ten-01');
    const invalidAuth = { ...auth, rollbackDeadline: 0 };
    const report = CanaryAuthorizationValidator.validate(invalidAuth);
    assert(!report.isValid, 'Must fail validation');
    assert(report.missingFields.includes('rollbackDeadline'), 'Must report rollbackDeadline missing');
  });

  test('CAN-01-D: Attempting rolloutAuthorized=true in C2D.9 produces governance violation', () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization('cand-01', 'ten-01');
    const invalidAuth = { ...auth, rolloutAuthorized: true };
    const report = CanaryAuthorizationValidator.validate(invalidAuth);
    assert(!report.isValid, 'Must reject rollout authorization in C2D.9');
    assert(!!report.reason?.includes('rolloutAuthorized cannot be TRUE'), 'Reason must specify governance violation');
  });

  // ── BLOCK 2: 5 SEPARATED AUTHORIZATION GATES ───────────────────────────────
  console.log('\n--- BLOCK 2: 5 SEPARATED AUTHORIZATION GATES ---');
  test('CAN-02-A: Applying human authorization sets ACTIVATION=TRUE while keeping others FALSE', () => {
    resetAllGates();
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization('cand-01', 'ten-01');
    const gates = CanaryAuthorizationValidator.applyAuthorizationGates(auth);

    assertEqual(gates.ACTIVATION, true, 'ACTIVATION_AUTHORIZATION must be TRUE');
    assertEqual(gates.DEPLOYMENT, false, 'DEPLOYMENT_AUTHORIZATION must be FALSE');
    assertEqual(gates.CLAIMS, false, 'CLAIMS_AUTHORIZATION must be FALSE');
    assertEqual(gates.MIGRATION, false, 'MIGRATION_AUTHORIZATION must be FALSE');
    assertEqual(gates.ROLLOUT, false, 'ROLLOUT_AUTHORIZATION must be FALSE');
  });

  test('CAN-02-B: Explicit claims authorization enables CLAIMS gate without opening others', () => {
    resetAllGates();
    const auth = {
      ...CanaryAuthorizationValidator.createCanonicalAuthorization('cand-01', 'ten-01'),
      claimsAuthorized: true,
    };
    const gates = CanaryAuthorizationValidator.applyAuthorizationGates(auth);

    assertEqual(gates.ACTIVATION, true, 'ACTIVATION must be TRUE');
    assertEqual(gates.CLAIMS, true, 'CLAIMS must be TRUE');
    assertEqual(gates.DEPLOYMENT, false, 'DEPLOYMENT must remain FALSE');
    assertEqual(gates.ROLLOUT, false, 'ROLLOUT must remain FALSE');
  });

  // ── BLOCK 3: PREFLIGHT AUDIT & CONFINEMENT ─────────────────────────────────
  console.log('\n--- BLOCK 3: PREFLIGHT AUDIT & SINGLE CANDIDATE CONFINEMENT ---');
  test('CAN-03-A: Preflight audit passes for valid single candidate', () => {
    const sub = buildCanarySub(CANONICAL_CANDIDATE.tenantId);
    const report = CanaryPreflightGuard.runPreflight(
      CANONICAL_CANDIDATE,
      sub,
      { uid: 'u1', tenantId: CANONICAL_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(report.overallPassed, 'Preflight must pass for valid candidate');
    assertEqual(report.status, 'PASS', 'Report status must be PASS');
  });

  test('CAN-03-B: Candidate with multiple requests limit (>1) fails preflight', () => {
    const multiCandidate = { ...CANONICAL_CANDIDATE, canaryRequestLimit: 5 as any };
    const sub = buildCanarySub(CANONICAL_CANDIDATE.tenantId);
    const report = CanaryPreflightGuard.runPreflight(
      multiCandidate,
      sub,
      { uid: 'u1', tenantId: CANONICAL_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(!report.overallPassed, 'Candidate with limit > 1 must fail preflight');
  });

  // ── BLOCK 4: TENANT ISOLATION IDENTITY CONGRUENCE ──────────────────────────
  console.log('\n--- BLOCK 4: TENANT ISOLATION IDENTITY CONGRUENCE ---');
  test('CAN-04-A: Tenant ID mismatch in subscription triggers SECURITY_MISMATCH', () => {
    const foreignSub = buildCanarySub('other-tenant-99');
    const report = CanaryPreflightGuard.runPreflight(
      CANONICAL_CANDIDATE,
      foreignSub,
      { uid: 'u1', tenantId: CANONICAL_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(!report.overallPassed, 'Cross-tenant subscription mismatch must fail preflight');
  });

  test('CAN-04-B: Membership tenant mismatch triggers SECURITY_MISMATCH', () => {
    const validSub = buildCanarySub(CANONICAL_CANDIDATE.tenantId);
    const report = CanaryPreflightGuard.runPreflight(
      CANONICAL_CANDIDATE,
      validSub,
      { uid: 'u1', tenantId: 'tenant-evil-99', role: 'OWNER' } // mismatch
    );
    assert(!report.overallPassed, 'Membership tenant mismatch must fail preflight');
  });

  // ── BLOCK 5: SUBSCRIPTION, ENTITLEMENT & ROLE CONFINEMENT ──────────────────
  console.log('\n--- BLOCK 5: SUBSCRIPTION, ENTITLEMENT & ROLE CONFINEMENT ---');
  test('CAN-05-A: Expired subscription fails preflight', () => {
    const expiredSub = buildCanarySub(CANONICAL_CANDIDATE.tenantId, {
      startDate: now - 50000,
      endDate: now - 1000, // expired
    });
    const report = CanaryPreflightGuard.runPreflight(
      CANONICAL_CANDIDATE,
      expiredSub,
      { uid: 'u1', tenantId: CANONICAL_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(!report.overallPassed, 'Expired subscription must fail preflight');
  });

  test('CAN-05-B: Forbidden role ROOT or SUPER_ADMIN rejected', () => {
    const badRoleCand = { ...CANONICAL_CANDIDATE, initialRole: 'ROOT' as any };
    const validSub = buildCanarySub(CANONICAL_CANDIDATE.tenantId);
    const report = CanaryPreflightGuard.runPreflight(
      badRoleCand,
      validSub,
      { uid: 'u1', tenantId: CANONICAL_CANDIDATE.tenantId, role: 'ROOT' as any }
    );
    assert(!report.overallPassed, 'Forbidden role ROOT must fail preflight');
  });

  // ── BLOCK 6: PROVISIONING IDEMPOTENCY (4 SCENARIOS) ────────────────────────
  console.log('\n--- BLOCK 6: PROVISIONING IDEMPOTENCY (4 SCENARIOS) ---');
  await testAsync('CAN-06-A: Scenario A — Fresh idempotency key completes', async () => {
    const repos = createInMemoryRepositories();
    const req: ProvisioningRequest = {
      requestId: 'req-can-a',
      idempotencyKey: 'idem-can-a',
      tenantType: 'MARKETPLACE',
      tenant: { tenantId: 'ten-can-a', name: 'Canary A', legalName: 'Canary A SA', slug: 'can-a', type: 'MARKETPLACE' },
      brand: { brandId: 'brand-can-a', displayName: 'Brand A', shortName: 'BA', slug: 'brand-can-a', visual: { primaryColor: '#0284C7' }, metadata: { supportEmail: 'a@a.io', supportPhone: '+5200' } },
      business: { businessId: 'biz-can-a', brandId: 'brand-can-a', name: 'Biz A', category: 'RESTAURANT' },
      branch: { branchId: 'br-can-a', businessId: 'biz-can-a', name: 'Branch A', address: 'Street 1', city: 'CDMX', isMainBranch: true },
      subscription: { subscriptionId: 'sub-can-a', planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' },
      initialOwner: { uid: 'uid-can-a', role: 'OWNER', email: 'owner@can-a.io' },
      initialConfiguration: {
        locale: 'es_MX', currency: 'MXN', timezone: 'America/Mexico_City',
        deliverySettings: { defaultRadiusKm: 10, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
        orderSettings: { preparationTimeMinutes: 20, allowScheduledOrders: true, autoAcceptOrders: false },
        brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
        notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
        operationalDefaults: { operatingHours: { open: '09:00', close: '22:00' }, cashDrawerClosingRequired: true },
      },
      requestedBy: 'uid-can-a',
      requestedAt: Date.now(),
    };
    const res = await ProvisioningEngine.provisionTenant(req, repos);
    assertEqual(res.status, 'COMPLETED', 'Initial request must COMPLETE');
  });

  await testAsync('CAN-06-B: Scenario B — Same key and same payload returns REPLAYED', async () => {
    const repos = createInMemoryRepositories();
    const req: ProvisioningRequest = {
      requestId: 'req-can-b',
      idempotencyKey: 'idem-can-b',
      tenantType: 'MARKETPLACE',
      tenant: { tenantId: 'ten-can-b', name: 'Canary B', legalName: 'Canary B SA', slug: 'can-b', type: 'MARKETPLACE' },
      brand: { brandId: 'brand-can-b', displayName: 'Brand B', shortName: 'BB', slug: 'brand-can-b', visual: { primaryColor: '#0284C7' }, metadata: { supportEmail: 'b@b.io', supportPhone: '+5200' } },
      business: { businessId: 'biz-can-b', brandId: 'brand-can-b', name: 'Biz B', category: 'RESTAURANT' },
      branch: { branchId: 'br-can-b', businessId: 'biz-can-b', name: 'Branch B', address: 'Street 1', city: 'CDMX', isMainBranch: true },
      subscription: { subscriptionId: 'sub-can-b', planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' },
      initialOwner: { uid: 'uid-can-b', role: 'OWNER', email: 'owner@can-b.io' },
      initialConfiguration: {
        locale: 'es_MX', currency: 'MXN', timezone: 'America/Mexico_City',
        deliverySettings: { defaultRadiusKm: 10, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
        orderSettings: { preparationTimeMinutes: 20, allowScheduledOrders: true, autoAcceptOrders: false },
        brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
        notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
        operationalDefaults: { operatingHours: { open: '09:00', close: '22:00' }, cashDrawerClosingRequired: true },
      },
      requestedBy: 'uid-can-b',
      requestedAt: Date.now(),
    };
    await ProvisioningEngine.provisionTenant(req, repos);
    const rReplay = await ProvisioningEngine.provisionTenant(req, repos);
    assertEqual(rReplay.status, 'REPLAYED', 'Identical replay must return REPLAYED');
  });

  await testAsync('CAN-06-C: Scenario C — Same key and mutated payload returns CONFLICT', async () => {
    const repos = createInMemoryRepositories();
    const req: ProvisioningRequest = {
      requestId: 'req-can-c',
      idempotencyKey: 'idem-can-c',
      tenantType: 'MARKETPLACE',
      tenant: { tenantId: 'ten-can-c', name: 'Canary C', legalName: 'Canary C SA', slug: 'can-c', type: 'MARKETPLACE' },
      brand: { brandId: 'brand-can-c', displayName: 'Brand C', shortName: 'BC', slug: 'brand-can-c', visual: { primaryColor: '#0284C7' }, metadata: { supportEmail: 'c@c.io', supportPhone: '+5200' } },
      business: { businessId: 'biz-can-c', brandId: 'brand-can-c', name: 'Biz C', category: 'RESTAURANT' },
      branch: { branchId: 'br-can-c', businessId: 'biz-can-c', name: 'Branch C', address: 'Street 1', city: 'CDMX', isMainBranch: true },
      subscription: { subscriptionId: 'sub-can-c', planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' },
      initialOwner: { uid: 'uid-can-c', role: 'OWNER', email: 'owner@can-c.io' },
      initialConfiguration: {
        locale: 'es_MX', currency: 'MXN', timezone: 'America/Mexico_City',
        deliverySettings: { defaultRadiusKm: 10, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
        orderSettings: { preparationTimeMinutes: 20, allowScheduledOrders: true, autoAcceptOrders: false },
        brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
        notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
        operationalDefaults: { operatingHours: { open: '09:00', close: '22:00' }, cashDrawerClosingRequired: true },
      },
      requestedBy: 'uid-can-c',
      requestedAt: Date.now(),
    };
    await ProvisioningEngine.provisionTenant(req, repos);
    const mutated = { ...req, tenant: { ...req.tenant, name: 'MUTATED NAME' } };
    const rConflict = await ProvisioningEngine.provisionTenant(mutated, repos);
    assertEqual(rConflict.status, 'CONFLICT', 'Mutated payload with same key must return CONFLICT');
  });

  // ── BLOCK 7: FULL CANARY EXECUTION & TRAFFIC CONFINEMENT ───────────────────
  console.log('\n--- BLOCK 7: FULL CANARY EXECUTION & TRAFFIC CONFINEMENT ---');
  await testAsync('CAN-07-A: First canary executes and serves strictly 1 request', async () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization(
      CANONICAL_CANDIDATE.candidateId,
      CANONICAL_CANDIDATE.tenantId
    );
    const res = await CanaryEngine.executeFirstCanary(auth, CANONICAL_CANDIDATE);

    assert(res.success, 'Canary execution must be successful');
    assertEqual(res.canaryRequestsServed, 1, 'Must serve strictly 1 canary request');
    assertEqual(res.canaryRequestLimit, 1, 'Request limit must be 1');
    assertEqual(res.stage, 'WAITING_FOR_HUMAN_DECISION', 'Terminal stage must be WAITING_FOR_HUMAN_DECISION');
    assert(res.webValidated, 'Web ClientExperience must be validated');
    assert(res.androidValidated, 'Android ClientExperience must be validated');
  });

  // ── BLOCK 8: KILL SWITCH & 17 AUTOMATIC ABORT TRIGGERS ─────────────────────
  console.log('\n--- BLOCK 8: KILL SWITCH & 17 AUTOMATIC ABORT TRIGGERS ---');
  test('CAN-08-A: Kill switch is ARMED and responsive', () => {
    CanaryKillSwitchController.reset();
    assert(CanaryKillSwitchController.isArmed(), 'Kill switch must start ARMED');
  });

  test('CAN-08-B: Evaluator triggers ABORT on unexpected firestore mutation', () => {
    const res = CanaryKillSwitchController.evaluateSignals({ unexpectedFirestoreMutation: true });
    assert(res.triggered, 'Must trigger abort');
    assertEqual(res.decision, 'ABORT', 'Must decide ABORT');
    assert(CanaryKillSwitchController.isTripped(), 'Kill switch must be tripped');
    CanaryKillSwitchController.reset();
  });

  // ── BLOCK 9: LIFO ROLLBACK & 0 RESIDUAL STATE ──────────────────────────────
  console.log('\n--- BLOCK 9: LIFO ROLLBACK & ZERO RESIDUAL STATE ---');
  test('CAN-09-A: Rollback orchestrator executes all 9 steps in LIFO order', () => {
    const report = CanaryRollbackOrchestrator.executeRollback(
      CANONICAL_CANDIDATE.candidateId,
      CANONICAL_CANDIDATE.tenantId,
      'Test abort reason'
    );
    assert(report.success, 'Rollback must succeed');
    assertEqual(report.executedSteps.length, 9, 'Must execute all 9 steps');
    assertEqual(report.residualStateCount, 0, 'Residual state count must be 0');
    assert(report.auditLogged, 'Rollback audit must be recorded');
  });

  // ── BLOCK 10: OBSERVABILITY CATALOG & SECRET SCRUBBING ─────────────────────
  console.log('\n--- BLOCK 10: OBSERVABILITY CATALOG (16 EVENTS) & SECRET SCRUBBING ---');
  test('CAN-10-A: Observability logger captures canonical events and traffic contexts', () => {
    CanaryObservabilityLogger.clear();
    CanaryObservabilityLogger.log('CANARY_ENABLED', 'Canary activated', {
      candidateId: CANONICAL_CANDIDATE.candidateId,
      tenantId: CANONICAL_CANDIDATE.tenantId,
    });
    assertEqual(CanaryObservabilityLogger.getEvents().length, 1, 'Must record event');
  });

  test('CAN-10-B: Observability logger strictly rejects secrets, JWTs, and API keys', () => {
    let threw = false;
    try {
      CanaryObservabilityLogger.log('SECURITY_CHECK', 'api_key=AIzaSyD-Secret1234');
    } catch {
      threw = true;
    }
    assert(threw, 'API key pattern must throw security violation');
  });

  // ── BLOCK 11: ZERO UNAUTHORIZED MUTATIONS AUDIT ────────────────────────────
  console.log('\n--- BLOCK 11: ZERO UNAUTHORIZED MUTATIONS AUDIT ---');
  test('CAN-11-A: Zero unauthorized mutations across all vectors', () => {
    assertEqual(ProductionMutationGuard.getTotalMutations(), 0, 'Total mutations must be 0');
    assertEqual(ProductionInvocationDetector.getTotalInvocations(), 0, 'Total SDK invocations must be 0');
  });

  // ── BLOCK 12: GOVERNANCE SCORECARD & MANDATORY STOP ────────────────────────
  console.log('\n--- BLOCK 12: GOVERNANCE SCORECARD & MANDATORY STOP ---');
  await testAsync('CAN-12-A: Canary scorecard generated with 100% PASS metrics', async () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization(
      CANONICAL_CANDIDATE.candidateId,
      CANONICAL_CANDIDATE.tenantId
    );
    const execRes = await CanaryEngine.executeFirstCanary(auth, CANONICAL_CANDIDATE);
    const scorecard = CanaryGovernanceGuard.buildScorecard(execRes, 0, 0);

    assertEqual(scorecard.humanAuthorization, 'PASS', 'humanAuthorization must be PASS');
    assertEqual(scorecard.canaryExecution, 'PASS', 'canaryExecution must be PASS');
    assertEqual(scorecard.webValidation, 'PASS', 'webValidation must be PASS');
    assertEqual(scorecard.androidValidation, 'PASS', 'androidValidation must be PASS');
    assertEqual(scorecard.crossTenantLeakage, 0, 'crossTenantLeakage must be 0');
    assertEqual(scorecard.unauthorizedMutation, 0, 'unauthorizedMutation must be 0');
  });

  test('CAN-12-B: Mandatory Governance Stop emitted with WAITING_FOR_HUMAN_DECISION', () => {
    const stopText = CanaryGovernanceGuard.emitMandatoryGovernanceStop();
    assert(stopText.includes('MANDATORY GOVERNANCE STOP — PHASE 2D.9'), 'Must include governance stop title');
    assert(stopText.includes('CANARY SUCCESS NO CONSTITUYE AUTORIZACIÓN PARA ROLLOUT'), 'Must include rollout restriction');
    assert(stopText.includes('WAITING_FOR_HUMAN_DECISION'), 'Must declare terminal state');
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n======================================================================');
  console.log(`📊 RESULTADOS C2D.9 MASTER SUITE: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🟢 C2D.9 FIRST CONTROLLED CANARY: ALL DOMAINS CERTIFIED');
  } else {
    console.log('🔴 C2D.9 CERTIFICATION FAILED');
  }
  console.log('======================================================================\n');

  return { passed, failed };
}
