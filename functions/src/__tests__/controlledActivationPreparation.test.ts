/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PHASE 2D.8 — CONTROLLED ACTIVATION PREPARATION
 * CHECKPOINT #1 — MASTER TEST SUITE
 *
 * SCOPE: All C2D.8 verification domains
 * MODE: LOCAL / IN-MEMORY / DRY-RUN / ZERO-PRODUCTION-MUTATION
 *
 * PRINCIPLE: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { FirstActivationCandidate } from '../activationPreparation/activationModels';
import {
  ActivationAuthorizationGate,
  DeploymentAuthorizationGate,
  ClaimsActivationGate,
  MigrationAuthorizationGate,
  RolloutAuthorizationGate,
  getAllGatesStatus,
  resetAllGates,
  assertC2D8GovernanceLocked,
} from '../activationPreparation/activationAuthorization';
import {
  ActivationScopeValidator,
  MINIMUM_VIABLE_ACTIVATION_SCOPE,
  isOperationInScope,
  isOperationExcluded,
} from '../activationPreparation/activationScope';
import { ActivationPreflightChecker } from '../activationPreparation/activationPreflight';
import { ActivationAbortCriteria } from '../activationPreparation/activationAbortCriteria';
import { ActivationSuccessCriteria } from '../activationPreparation/activationSuccessCriteria';
import { ActivationWindowValidator } from '../activationPreparation/activationWindow';
import { ActivationResponsibilityMatrixBuilder } from '../activationPreparation/activationResponsibilityMatrix';
import { ActivationDryRunOrchestrator } from '../activationPreparation/activationDryRun';
import { ActivationRollbackPlanSimulator } from '../activationPreparation/activationRollbackPlan';
import { ActivationObservabilityLogger } from '../activationPreparation/activationObservability';
import { ActivationGovernanceGuard } from '../activationPreparation/activationGovernanceGuard';
import { CanaryKillSwitch } from '../canary/canaryKillSwitch';
import { ProductionMutationGuard } from '../productionReadiness/productionMutationGuard';
import { ProductionInvocationDetector } from '../productionReadiness/productionInvocationDetector';
import { ConfigurationDriftAudit } from '../productionReadiness/configurationDriftAudit';
import { EnvironmentBoundaryGuard } from '../productionReadiness/environmentBoundaryGuard';
import { createInMemoryRepositories } from '../domain/provisioning/repositories';
import { ProvisioningEngine } from '../domain/provisioning/provisioningPipeline';
import type { ProvisioningRequest, InitialTenantConfiguration } from '../domain/provisioning/models';

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

// ── Canonical Simulation Candidate ───────────────────────────────────────────
const CANDIDATE_FIXTURE: FirstActivationCandidate = {
  candidateId: 'cand-first-activation-01',
  tenantId: 'ten-sim-first-01',
  brandId: 'brand-sim-first-01',
  businessId: 'biz-sim-first-01',
  branchId: 'branch-sim-first-01',
  commercialModel: 'MARKETPLACE',
  subscriptionPlan: 'PROFESSIONAL',
  entitlements: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'CONTROL_TOWER', 'SETTINGS'],
  initialRole: 'OWNER',
  activationScope: MINIMUM_VIABLE_ACTIVATION_SCOPE,
  expectedModules: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'CONTROL_TOWER', 'SETTINGS'],
  expectedQuotaLimits: { maxBranches: 5, maxCouriers: 10, maxProducts: 500, maxOrdersPerMonth: 1000 },
  rollbackScope: {
    steps: ['TRIGGER', 'FREEZE', 'STOP_TRAFFIC', 'DISABLE_ACTIVATION', 'REVOKE_TEMP_AUTHORIZATION', 'RESTORE_PREVIOUS_STATE', 'VALIDATE', 'AUDIT'],
    lifoOrder: true,
    residualStateZero: true,
  },
  simulationOnly: true,
  mustNotExistInProduction: true,
};

export async function runControlledActivationPreparationTests(): Promise<{ passed: number; failed: number }> {
  results.length = 0;
  resetAllGates();
  ActivationObservabilityLogger.clear();
  ProductionMutationGuard.reset();
  ProductionInvocationDetector.reset();

  console.log('\n======================================================================');
  console.log('🔵 PHASE 2D.8 — CONTROLLED ACTIVATION PREPARATION MASTER TEST SUITE');
  console.log('   Mode: LOCAL / IN-MEMORY / DRY-RUN / ZERO-PRODUCTION-MUTATION');
  console.log('======================================================================');

  // ── BLOCK 1: BASELINE & REVERSIBILITY ───────────────────────────────────────
  console.log('\n--- BLOCK 1: C2D.7 BASELINE & REVERSIBILITY ---');
  test('CAP-01-A: Baseline C2D.7 integrity confirmed (0 drift)', () => {
    const driftReport = ConfigurationDriftAudit.simulatedDriftAudit();
    assertEqual(driftReport.driftCount, 0, 'Drift count must be 0 vs C2D.6/C2D.7 baseline');
    assertEqual(driftReport.overallStatus, 'PASS', 'Overall drift status must be PASS');
  });

  test('CAP-01-B: Environment boundary strictly confined to LOCAL/TEST/SIMULATION', () => {
    const report = EnvironmentBoundaryGuard.verifyPermittedTier('LOCAL');
    assert(report.isPermitted, 'LOCAL tier must be permitted');
    assertEqual(report.status, 'PASS', 'Environment boundary status must be PASS');
  });

  test('CAP-01-C: Production tier forbidden and rejected', () => {
    const report = EnvironmentBoundaryGuard.verifyPermittedTier('PRODUCTION');
    assert(!report.isPermitted, 'PRODUCTION tier must be strictly forbidden');
    assertEqual(report.status, 'NO-GO', 'PRODUCTION tier must return NO-GO');
  });

  // ── BLOCK 2: CANDIDATE DEFINITION & SCOPE ──────────────────────────────────
  console.log('\n--- BLOCK 2: CANDIDATE DEFINITION & SCOPE CONFINEMENT ---');
  test('CAP-02-A: FirstActivationCandidate fixture has simulation-only guards', () => {
    assert(CANDIDATE_FIXTURE.simulationOnly === true, 'simulationOnly guard must be true');
    assert(CANDIDATE_FIXTURE.mustNotExistInProduction === true, 'mustNotExistInProduction guard must be true');
  });

  test('CAP-02-B: Minimum Viable Activation Scope includes all 12 core items', () => {
    const validator = new ActivationScopeValidator();
    assertEqual(validator.getScopeSummary().included.length, 12, '12 core items must be included');
    assert(isOperationInScope('CORE_BACKEND'), 'CORE_BACKEND must be in scope');
    assert(isOperationInScope('WEB_EXPERIENCE'), 'WEB_EXPERIENCE must be in scope');
    assert(isOperationInScope('ANDROID_EXPERIENCE'), 'ANDROID_EXPERIENCE must be in scope');
  });

  test('CAP-02-C: Minimum Viable Activation Scope excludes all 8 risky items', () => {
    assertEqual(MINIMUM_VIABLE_ACTIVATION_SCOPE.explicitlyExcluded.length, 8, '8 risky items must be excluded');
    assert(isOperationExcluded('ADDITIONAL_TENANTS'), 'ADDITIONAL_TENANTS must be excluded');
    assert(isOperationExcluded('MASS_CLAIMS_ROLLOUT'), 'MASS_CLAIMS_ROLLOUT must be excluded');
    assert(isOperationExcluded('BULK_PROVISIONING'), 'BULK_PROVISIONING must be excluded');
  });

  test('CAP-02-D: Out-of-scope operations trigger governance violations', () => {
    const validator = new ActivationScopeValidator();
    const result = validator.validate('MASS_CLAIMS_ROLLOUT');
    assert(!result.allowed, 'MASS_CLAIMS_ROLLOUT must be rejected');
    assert(result.violation !== undefined, 'Violation must be recorded');
  });

  // ── BLOCK 3: HUMAN AUTHORIZATION & SEPARATED GATES ─────────────────────────
  console.log('\n--- BLOCK 3: HUMAN AUTHORIZATION & SEPARATED GATES ---');
  test('CAP-03-A: All 5 authorization gates start UNINITIALIZED or DRAFT', () => {
    resetAllGates();
    const status = getAllGatesStatus();
    assert(status.allUnauthorized, 'All gates must start unauthorized');
    assertEqual(status.ACTIVATION, 'UNINITIALIZED', 'ACTIVATION gate must be UNINITIALIZED');
    assertEqual(status.DEPLOYMENT, 'UNINITIALIZED', 'DEPLOYMENT gate must be UNINITIALIZED');
    assertEqual(status.CLAIMS, 'UNINITIALIZED', 'CLAIMS gate must be UNINITIALIZED');
    assertEqual(status.MIGRATION, 'UNINITIALIZED', 'MIGRATION gate must be UNINITIALIZED');
    assertEqual(status.ROLLOUT, 'UNINITIALIZED', 'ROLLOUT gate must be UNINITIALIZED');
  });

  test('CAP-03-B: Gate separation verified — approving ACTIVATION does not approve DEPLOYMENT or CLAIMS', () => {
    resetAllGates();
    ActivationAuthorizationGate.request('actor-1', 'Simulated review', 'cand-01');
    ActivationAuthorizationGate.review('reviewer-1');
    ActivationAuthorizationGate.approve('approver-1');

    assert(ActivationAuthorizationGate.isAuthorized(), 'ACTIVATION gate is authorized');
    assert(!DeploymentAuthorizationGate.isAuthorized(), 'DEPLOYMENT gate must remain UNAUTHORIZED');
    assert(!ClaimsActivationGate.isAuthorized(), 'CLAIMS gate must remain UNAUTHORIZED');
    assert(!MigrationAuthorizationGate.isAuthorized(), 'MIGRATION gate must remain UNAUTHORIZED');
    assert(!RolloutAuthorizationGate.isAuthorized(), 'ROLLOUT gate must remain UNAUTHORIZED');
    resetAllGates();
  });

  test('CAP-03-C: assertC2D8GovernanceLocked passes when gates are at initial state', () => {
    resetAllGates();
    let threw = false;
    try {
      assertC2D8GovernanceLocked();
    } catch {
      threw = true;
    }
    assert(!threw, 'assertC2D8GovernanceLocked must pass at initial state');
  });

  test('CAP-03-D: Rejection and Revocation transitions work accurately', () => {
    resetAllGates();
    ActivationAuthorizationGate.request('actor-1', 'Test request', 'cand-01');
    ActivationAuthorizationGate.reject('approver-1', 'Test rejection');
    assertEqual(ActivationAuthorizationGate.getStatus(), 'REJECTED', 'Gate status must be REJECTED');
    assert(!ActivationAuthorizationGate.isAuthorized(), 'Rejected gate cannot be authorized');
    resetAllGates();
  });

  // ── BLOCK 4: PRE-FLIGHT CHECKLIST ──────────────────────────────────────────
  console.log('\n--- BLOCK 4: PRE-FLIGHT CHECKLIST ENGINE ---');
  test('CAP-04-A: Pre-flight checklist evaluates 22 critical items', () => {
    const report = ActivationPreflightChecker.runChecklist();
    assertEqual(report.items.length, 22, 'Must evaluate exactly 22 pre-flight items');
  });

  test('CAP-04-B: Pre-flight checklist overallStatus is PASS with zero critical failures', () => {
    const report = ActivationPreflightChecker.runChecklist();
    assertEqual(report.overallStatus, 'PASS', 'Preflight checklist status must be PASS');
    assertEqual(report.criticalFailures.length, 0, 'Must have 0 critical failures');
  });

  // ── BLOCK 5: ACTIVATION WINDOW CONTRACT ────────────────────────────────────
  console.log('\n--- BLOCK 5: ACTIVATION WINDOW VALIDATION ---');
  test('CAP-05-A: Canonical simulation window validates successfully', () => {
    const win = ActivationWindowValidator.createSimulationWindow();
    const report = ActivationWindowValidator.validate(win);
    assert(report.isValid, 'Simulation window must be valid');
    assertEqual(report.errors.length, 0, 'Must have 0 window validation errors');
  });

  test('CAP-05-B: Window validation rejects start >= end', () => {
    const now = Date.now();
    const invalidWin = { ...ActivationWindowValidator.createSimulationWindow(), start: now + 5000, end: now + 1000 };
    const report = ActivationWindowValidator.validate(invalidWin);
    assert(!report.isValid, 'Invalid time range must be rejected');
  });

  test('CAP-05-C: Window validation requires changeFreeze = true', () => {
    const invalidWin = { ...ActivationWindowValidator.createSimulationWindow(), changeFreeze: false };
    const report = ActivationWindowValidator.validate(invalidWin);
    assert(!report.isValid, 'Disabled change freeze must be rejected');
  });

  // ── BLOCK 6: RESPONSIBILITY MATRIX & GOVERNANCE GAPS ───────────────────────
  console.log('\n--- BLOCK 6: RESPONSIBILITY MATRIX ---');
  test('CAP-06-A: Default responsibility matrix assigns RACI roles across all 6 areas', () => {
    const matrix = ActivationResponsibilityMatrixBuilder.buildMatrix();
    assertEqual(matrix.entries.length, 6, 'Must have 6 responsibility areas');
    assertEqual(matrix.governanceGaps.length, 0, 'Default assignments must have 0 gaps');
  });

  test('CAP-06-B: Explicitly unassigned role is flagged as a governance gap', () => {
    const matrix = ActivationResponsibilityMatrixBuilder.buildMatrix({
      Migration: { executor: 'UNDEFINED' },
    });
    assert(matrix.governanceGaps.length > 0, 'UNDEFINED role must be detected as governance gap');
    assert(matrix.governanceGaps[0].includes('Migration.executor is UNDEFINED'), 'Gap details must name the missing role');
  });

  // ── BLOCK 7: OBSERVABILITY & SECRET SCRUBBING ──────────────────────────────
  console.log('\n--- BLOCK 7: OBSERVABILITY CATALOG & SECRET SCRUBBING ---');
  test('CAP-07-A: Observability logger logs valid events without secrets', () => {
    ActivationObservabilityLogger.clear();
    const evt = ActivationObservabilityLogger.log('ACTIVATION_PREPARED', 'Candidate validated', { candidateId: 'c1' });
    assertEqual(evt.type, 'ACTIVATION_PREPARED', 'Event type must be ACTIVATION_PREPARED');
    assertEqual(ActivationObservabilityLogger.getEvents().length, 1, 'Event store must contain 1 event');
  });

  test('CAP-07-B: Observability logger rejects password or JWT secrets', () => {
    let threwJwt = false;
    try {
      ActivationObservabilityLogger.log('ACTIVATION_STARTED', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0');
    } catch {
      threwJwt = true;
    }
    assert(threwJwt, 'JWT in event content must throw security violation');

    let threwPass = false;
    try {
      ActivationObservabilityLogger.log('ACTIVATION_STARTED', 'password=superSecret123');
    } catch {
      threwPass = true;
    }
    assert(threwPass, 'Password in event content must throw security violation');
  });

  // ── BLOCK 8: LIFO ROLLBACK SIMULATION ──────────────────────────────────────
  console.log('\n--- BLOCK 8: LIFO ROLLBACK SIMULATION ---');
  test('CAP-08-A: Rollback plan definition enforces LIFO and all 8 steps', () => {
    const plan = ActivationRollbackPlanSimulator.createPlanDefinition('cand-01');
    assert(plan.lifoEnforced, 'LIFO must be enforced');
    assertEqual(plan.steps.length, 8, 'Must define exactly 8 rollback steps');
  });

  test('CAP-08-B: Rollback simulation achieves residualStateCount = 0', () => {
    const plan = ActivationRollbackPlanSimulator.createPlanDefinition('cand-01');
    const report = ActivationRollbackPlanSimulator.simulateRollback(plan);
    assert(report.success, 'Rollback simulation must succeed');
    assertEqual(report.residualStateCount, 0, 'Residual state count must be 0');
    assertEqual(report.executedSteps.length, 8, 'Must execute all 8 steps');
  });

  // ── BLOCK 9: ABORT & SUCCESS CRITERIA ──────────────────────────────────────
  console.log('\n--- BLOCK 9: ABORT & SUCCESS CRITERIA ---');
  test('CAP-09-A: Abort criteria evaluator returns NO_ABORT when clean', () => {
    const res = ActivationAbortCriteria.evaluate({});
    assert(!res.triggered, 'Clean signals must not trigger abort');
    assertEqual(res.decision, 'NO_ABORT', 'Decision must be NO_ABORT');
  });

  test('CAP-09-B: Cross-tenant anomaly triggers immediate critical ABORT', () => {
    const res = ActivationAbortCriteria.evaluate({ crossTenantAnomalyDetected: true });
    assert(res.triggered, 'Anomaly must trigger abort');
    assertEqual(res.decision, 'ABORT', 'Decision must be ABORT');
    assertEqual(res.governanceViolation?.severity, 'CRITICAL', 'Violation severity must be CRITICAL');
  });

  test('CAP-09-C: Success criteria validator confirms all 16 metrics pass in healthy context', () => {
    const rep = ActivationSuccessCriteria.validate({
      tenantIdMatches: true,
      brandIdMatches: true,
      subscriptionPlanMatches: true,
      entitlementsCorrect: true,
      membershipOwnerValid: true,
      gatekeeperEnforcementVerified: true,
      quotaLimitsEnforced: true,
      webExperienceHydrated: true,
      androidExperienceHydrated: true,
      crossTenantLeakageCount: 0,
      privilegeEscalationCount: 0,
      unexpectedMutationCount: 0,
      observabilityEventsComplete: true,
      rollbackPlanAvailable: true,
      killSwitchArmed: true,
      clientParityVerified: true,
    });
    assert(rep.allPassed, 'All 16 success criteria must pass');
    assertEqual(rep.criteria.length, 16, 'Must validate 16 criteria');
  });

  // ── BLOCK 10: PROVISIONING DRY-RUN & IDEMPOTENCY ───────────────────────────
  console.log('\n--- BLOCK 10: PROVISIONING DRY-RUN & 4 IDEMPOTENCY SCENARIOS ---');
  await testAsync('CAP-10-A: Scenario A — Initial Provisioning Dry-Run completes in-memory', async () => {
    const repos = createInMemoryRepositories();
    const req: ProvisioningRequest = {
      requestId: 'req-idem-a',
      idempotencyKey: 'idem-key-a',
      tenantType: 'MARKETPLACE',
      tenant: { tenantId: 'ten-a', name: 'Tenant A', legalName: 'Tenant A SA', slug: 'ten-a', type: 'MARKETPLACE' },
      brand: { brandId: 'brand-a', displayName: 'Brand A', shortName: 'BA', slug: 'brand-a', visual: { primaryColor: '#0284C7' }, metadata: { supportEmail: 'a@a.io', supportPhone: '+5200' } },
      business: { businessId: 'biz-a', brandId: 'brand-a', name: 'Biz A', category: 'RESTAURANT' },
      branch: { branchId: 'br-a', businessId: 'biz-a', name: 'Branch A', address: 'Street 1', city: 'CDMX', isMainBranch: true },
      subscription: { subscriptionId: 'sub-a', planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' },
      initialOwner: { uid: 'uid-a', role: 'OWNER', email: 'owner@a.io' },
      initialConfiguration: {
        locale: 'es_MX', currency: 'MXN', timezone: 'America/Mexico_City',
        deliverySettings: { defaultRadiusKm: 10, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
        orderSettings: { preparationTimeMinutes: 20, allowScheduledOrders: true, autoAcceptOrders: false },
        brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
        notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
        operationalDefaults: { operatingHours: { open: '09:00', close: '22:00' }, cashDrawerClosingRequired: true },
      },
      requestedBy: 'uid-a',
      requestedAt: Date.now(),
    };
    const r1 = await ProvisioningEngine.provisionTenant(req, repos);
    assertEqual(r1.status, 'COMPLETED', 'Initial request must COMPLETE');
  });

  await testAsync('CAP-10-B: Scenario B — Identical Replay returns REPLAYED with zero duplicate writes', async () => {
    const repos = createInMemoryRepositories();
    const req: ProvisioningRequest = {
      requestId: 'req-idem-b',
      idempotencyKey: 'idem-key-b',
      tenantType: 'MARKETPLACE',
      tenant: { tenantId: 'ten-b', name: 'Tenant B', legalName: 'Tenant B SA', slug: 'ten-b', type: 'MARKETPLACE' },
      brand: { brandId: 'brand-b', displayName: 'Brand B', shortName: 'BB', slug: 'brand-b', visual: { primaryColor: '#0284C7' }, metadata: { supportEmail: 'b@b.io', supportPhone: '+5200' } },
      business: { businessId: 'biz-b', brandId: 'brand-b', name: 'Biz B', category: 'RESTAURANT' },
      branch: { branchId: 'br-b', businessId: 'biz-b', name: 'Branch B', address: 'Street 1', city: 'CDMX', isMainBranch: true },
      subscription: { subscriptionId: 'sub-b', planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' },
      initialOwner: { uid: 'uid-b', role: 'OWNER', email: 'owner@b.io' },
      initialConfiguration: {
        locale: 'es_MX', currency: 'MXN', timezone: 'America/Mexico_City',
        deliverySettings: { defaultRadiusKm: 10, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
        orderSettings: { preparationTimeMinutes: 20, allowScheduledOrders: true, autoAcceptOrders: false },
        brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
        notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
        operationalDefaults: { operatingHours: { open: '09:00', close: '22:00' }, cashDrawerClosingRequired: true },
      },
      requestedBy: 'uid-b',
      requestedAt: Date.now(),
    };
    await ProvisioningEngine.provisionTenant(req, repos);
    const r2 = await ProvisioningEngine.provisionTenant(req, repos);
    assertEqual(r2.status, 'REPLAYED', 'Identical replay must return REPLAYED');
  });

  await testAsync('CAP-10-C: Scenario C — Same key + mutated payload produces CONFLICT', async () => {
    const repos = createInMemoryRepositories();
    const req: ProvisioningRequest = {
      requestId: 'req-idem-c',
      idempotencyKey: 'idem-key-c',
      tenantType: 'MARKETPLACE',
      tenant: { tenantId: 'ten-c', name: 'Tenant C', legalName: 'Tenant C SA', slug: 'ten-c', type: 'MARKETPLACE' },
      brand: { brandId: 'brand-c', displayName: 'Brand C', shortName: 'BC', slug: 'brand-c', visual: { primaryColor: '#0284C7' }, metadata: { supportEmail: 'c@c.io', supportPhone: '+5200' } },
      business: { businessId: 'biz-c', brandId: 'brand-c', name: 'Biz C', category: 'RESTAURANT' },
      branch: { branchId: 'br-c', businessId: 'biz-c', name: 'Branch C', address: 'Street 1', city: 'CDMX', isMainBranch: true },
      subscription: { subscriptionId: 'sub-c', planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' },
      initialOwner: { uid: 'uid-c', role: 'OWNER', email: 'owner@c.io' },
      initialConfiguration: {
        locale: 'es_MX', currency: 'MXN', timezone: 'America/Mexico_City',
        deliverySettings: { defaultRadiusKm: 10, baseFare: 35, perKmFare: 15, autoDispatchEnabled: true },
        orderSettings: { preparationTimeMinutes: 20, allowScheduledOrders: true, autoAcceptOrders: false },
        brandingDefaults: { primaryColor: '#0284C7', appName: 'BlueSystem' },
        notificationPreferences: { orderStatusUpdates: true, promotionalPush: true, soundAlertsEnabled: true },
        operationalDefaults: { operatingHours: { open: '09:00', close: '22:00' }, cashDrawerClosingRequired: true },
      },
      requestedBy: 'uid-c',
      requestedAt: Date.now(),
    };
    await ProvisioningEngine.provisionTenant(req, repos);
    const mutated = { ...req, tenant: { ...req.tenant, name: 'MUTATED NAME' } };
    const rConflict = await ProvisioningEngine.provisionTenant(mutated, repos);
    assertEqual(rConflict.status, 'CONFLICT', 'Mutated payload with same key must return CONFLICT');
  });

  await testAsync('CAP-10-D: Scenario D — Full Candidate Dry-Run executes all 7 pipeline stages', async () => {
    const dryRunResult = await ActivationDryRunOrchestrator.runFullDryRun(CANDIDATE_FIXTURE);
    assertEqual(dryRunResult.status, 'DRY_RUN_SUCCESS', 'Full candidate dry run must return DRY_RUN_SUCCESS');
    assertEqual(dryRunResult.stages.length, 7, 'Must execute exactly 7 pipeline stages');
    assert(dryRunResult.parityVerified, 'Web ≡ Android client parity must be verified');
    assertEqual(dryRunResult.productionMutations, 0, 'Production mutations must strictly be 0');
  });

  // ── BLOCK 11: ZERO PRODUCTION MUTATIONS ────────────────────────────────────
  console.log('\n--- BLOCK 11: ZERO PRODUCTION MUTATIONS AUDIT ---');
  test('CAP-11-A: Firestore production operations count = 0', () => {
    assertEqual(ProductionMutationGuard.getCount('FIRESTORE_WRITE'), 0, 'FIRESTORE_WRITE = 0');
  });

  test('CAP-11-B: Auth & Claims mutations count = 0', () => {
    assertEqual(ProductionMutationGuard.getCount('AUTH_MUTATION'), 0, 'AUTH_MUTATION = 0');
    assertEqual(ProductionMutationGuard.getCount('CLAIMS_MUTATION'), 0, 'CLAIMS_MUTATION = 0');
  });

  test('CAP-11-C: Real SDK invocations count = 0', () => {
    assertEqual(ProductionInvocationDetector.getTotalInvocations(), 0, 'SDK Invocations = 0');
  });

  test('CAP-11-D: Total production mutations across all vectors = 0', () => {
    assertEqual(ProductionMutationGuard.getTotalMutations(), 0, 'Total mutations must be 0');
  });

  // ── BLOCK 12: GOVERNANCE DECISION & MANDATORY STOP ─────────────────────────
  console.log('\n--- BLOCK 12: GOVERNANCE DECISION & MANDATORY STOP ---');
  await testAsync('CAP-12-A: Final governance decision evaluates to PREPARED', async () => {
    const preflight = ActivationPreflightChecker.runChecklist();
    const dryRun = await ActivationDryRunOrchestrator.runFullDryRun(CANDIDATE_FIXTURE);
    const decision = ActivationGovernanceGuard.evaluate({
      preflightReport: preflight,
      dryRunResult: dryRun,
      securityAttackFailures: 0,
      regressionFailures: 0,
    });
    assertEqual(decision.outcome, 'PREPARED', 'Governance decision outcome must be PREPARED');
    assertEqual(decision.activationAuthorizationStatus, 'FALSE', 'ACTIVATION_AUTHORIZATION must be FALSE');
    assert(decision.mandatoryGovernanceStop === true, 'mandatoryGovernanceStop must be true');
  });

  test('CAP-12-B: Mandatory Governance Stop text is emitted', () => {
    const stopText = ActivationGovernanceGuard.emitMandatoryGovernanceStop();
    assert(stopText.includes('MANDATORY GOVERNANCE STOP — PHASE 2D.8'), 'Must include governance stop header');
    assert(stopText.includes('READINESS DOES NOT AUTHORIZE ACTIVATION'), 'Must include core governance invariant');
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n======================================================================');
  console.log(`📊 RESULTADOS C2D.8 MASTER SUITE: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🟢 C2D.8 CONTROLLED ACTIVATION PREPARATION: ALL CRITERIA CERTIFIED');
  } else {
    console.log('🔴 C2D.8 CERTIFICATION FAILED');
  }
  console.log('======================================================================\n');

  return { passed, failed };
}
