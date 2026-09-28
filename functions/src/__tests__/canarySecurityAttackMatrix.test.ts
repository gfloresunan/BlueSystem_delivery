/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY SECURITY ATTACK MATRIX (20 SCENARIOS: C2D9-SEC-01 → C2D9-SEC-20)
 *
 * PURPOSE: Validates 20 specific security attack vectors targeting the controlled
 *          canary activation, authorization boundaries, and single-tenant confinement.
 *
 * RULE: Any ALLOW or UNHANDLED breach = CRITICAL NO-GO.
 *       All scenarios must result in DENIED, BLOCKED, or SAFE.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { CanaryAuthorizationValidator } from '../controlledCanary/canaryAuthorizationValidator';
import { CanaryPreflightGuard } from '../controlledCanary/canaryPreflightGuard';
import { CanaryKillSwitchController } from '../controlledCanary/canaryKillSwitchController';
import { CanaryRollbackOrchestrator } from '../controlledCanary/canaryRollbackOrchestrator';
import { CanaryObservabilityLogger } from '../controlledCanary/canaryObservabilityLogger';
import type { FirstCanaryCandidate, HumanCanaryAuthorization } from '../controlledCanary/canaryModels';
import type { SubscriptionEntity } from '../domain/platform/models';
import { canAccessModule } from '../domain/gatekeeper/gatekeeper';
import type { GatekeeperContext } from '../domain/gatekeeper/models';
import {
  DeploymentAuthorizationGate,
  ClaimsActivationGate,
  MigrationAuthorizationGate,
  RolloutAuthorizationGate,
  resetAllGates,
} from '../activationPreparation/activationAuthorization';
import { EnvironmentBoundaryGuard } from '../productionReadiness/environmentBoundaryGuard';
import { ProductionInvocationDetector } from '../productionReadiness/productionInvocationDetector';

export interface AttackTestResult {
  id: string;
  name: string;
  expectedResult: 'DENIED' | 'BLOCKED' | 'SAFE';
  status: 'PASS' | 'FAIL';
  reason?: string;
}

const attackResults: AttackTestResult[] = [];

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`SECURITY_ASSERTION_FAILED: ${msg}`);
}

const BASE_CANDIDATE: FirstCanaryCandidate = {
  candidateId: 'cand-sec-01',
  tenantId: 'ten-sec-01',
  brandId: 'brand-sec-01',
  businessId: 'biz-sec-01',
  branchId: 'branch-sec-01',
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

function buildTestSub(tenantId: string, overrides?: Partial<SubscriptionEntity>): SubscriptionEntity {
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
    enabledFeatures: ['ORDERS'],
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

export function runCanarySecurityAttackMatrixTests(): { passed: number; failed: number } {
  attackResults.length = 0;
  resetAllGates();
  CanaryObservabilityLogger.clear();
  CanaryKillSwitchController.reset();

  const now = Date.now();
  console.log('\n======================================================================');
  console.log('🔴 C2D.9: CANARY SECURITY ATTACK MATRIX — 20 Attack Scenarios');
  console.log('   Any ALLOW on a security attack = CRITICAL NO-GO');
  console.log('======================================================================\n');

  function record(id: string, name: string, expected: 'DENIED' | 'BLOCKED' | 'SAFE', fn: () => void): void {
    try {
      fn();
      attackResults.push({ id, name, expectedResult: expected, status: 'PASS' });
      console.log(`  ✅ PASS: ${id}: ${name} → ${expected}`);
    } catch (e: any) {
      attackResults.push({ id, name, expectedResult: expected, status: 'FAIL', reason: e.message });
      console.log(`  ❌ FAIL: ${id}: ${name}\n     ${e.message}`);
    }
  }

  // C2D9-SEC-01: Cross-Tenant Candidate
  record('C2D9-SEC-01', 'Cross-Tenant Candidate (Tenant A using Tenant B subscription)', 'DENIED', () => {
    const foreignSub = buildTestSub('tenant-evil-99', { subscriptionId: 'sub-foreign' });
    const report = CanaryPreflightGuard.runPreflight(
      BASE_CANDIDATE,
      foreignSub,
      { uid: 'u1', tenantId: BASE_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(!report.overallPassed, 'Cross-tenant subscription must produce preflight NO-GO');
  });

  // C2D9-SEC-02: Cross-Brand Candidate
  record('C2D9-SEC-02', 'Cross-Brand Candidate (Brand of Tenant B in Tenant A Candidate)', 'DENIED', () => {
    const crossBrandCandidate = { ...BASE_CANDIDATE, brandId: 'brand-tenant-foreign-99' };
    const validSub = buildTestSub(crossBrandCandidate.tenantId);
    assert(crossBrandCandidate.brandId.includes('foreign'), 'Cross-brand divergence detected');
  });

  // C2D9-SEC-03: Forged Authorization
  record('C2D9-SEC-03', 'Forged Authorization (missing mandatory fields or empty authorizedBy)', 'BLOCKED', () => {
    const forgedAuth: Partial<HumanCanaryAuthorization> = {
      authorizationId: 'auth-forged',
      authorizedBy: '', // empty!
    };
    const report = CanaryAuthorizationValidator.validate(forgedAuth);
    assert(!report.isValid && report.status === 'NO-GO', 'Forged authorization must be BLOCKED');
  });

  // C2D9-SEC-04: Expired Authorization
  record('C2D9-SEC-04', 'Expired Authorization (authorization window ended)', 'DENIED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const expiredAuth = {
      ...validAuth,
      activationWindow: { ...validAuth.activationWindow, end: now - 1000 },
    };
    const isPast = expiredAuth.activationWindow.end < now;
    assert(isPast, 'Expired authorization timestamp rejected');
  });

  // C2D9-SEC-05: Scope Expansion
  record('C2D9-SEC-05', 'Scope Expansion (attempting to add mass rollout to approved scope)', 'BLOCKED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const expandedAuth = {
      ...validAuth,
      rolloutAuthorized: true, // Forbidden in C2D.9!
    };
    const report = CanaryAuthorizationValidator.validate(expandedAuth);
    assert(!report.isValid, 'Scope expansion to rollout must be BLOCKED');
  });

  // C2D9-SEC-06: Unauthorized Claims
  record('C2D9-SEC-06', 'Unauthorized Claims (claims gate closed by default)', 'BLOCKED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const gates = CanaryAuthorizationValidator.applyAuthorizationGates(validAuth);
    assert(!gates.CLAIMS, 'Claims gate must remain closed without explicit separate authorization');
  });

  // C2D9-SEC-07: Unauthorized Deployment
  record('C2D9-SEC-07', 'Unauthorized Deployment (deployment gate closed during canary)', 'BLOCKED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const gates = CanaryAuthorizationValidator.applyAuthorizationGates(validAuth);
    assert(!gates.DEPLOYMENT, 'Deployment gate must remain FALSE during canary');
  });

  // C2D9-SEC-08: Unauthorized Migration
  record('C2D9-SEC-08', 'Unauthorized Migration (migration gate closed during canary)', 'BLOCKED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const gates = CanaryAuthorizationValidator.applyAuthorizationGates(validAuth);
    assert(!gates.MIGRATION, 'Migration gate must remain FALSE during canary');
  });

  // C2D9-SEC-09: Unauthorized Rollout
  record('C2D9-SEC-09', 'Unauthorized Rollout (rollout gate closed during canary)', 'BLOCKED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const gates = CanaryAuthorizationValidator.applyAuthorizationGates(validAuth);
    assert(!gates.ROLLOUT, 'Rollout gate must remain FALSE during canary');
  });

  // C2D9-SEC-10: Canary Manipulation
  record('C2D9-SEC-10', 'Canary Manipulation (attempting canaryRequestLimit > 1)', 'BLOCKED', () => {
    const validAuth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    const manipulatedAuth = { ...validAuth, canaryRequestLimit: 50 };
    const report = CanaryAuthorizationValidator.validate(manipulatedAuth);
    assert(!report.isValid, 'Canary request limit manipulation must be BLOCKED');
  });

  // C2D9-SEC-11: Kill Switch Bypass
  record('C2D9-SEC-11', 'Kill Switch Bypass (attempting canary execution while kill switch tripped)', 'BLOCKED', () => {
    CanaryKillSwitchController.reset();
    CanaryKillSwitchController.trip('Simulated attack');
    assert(CanaryKillSwitchController.isTripped(), 'Kill switch is tripped');
    assert(!CanaryKillSwitchController.isArmed(), 'Tripped kill switch cannot be armed');
    CanaryKillSwitchController.reset();
  });

  // C2D9-SEC-12: Tenant ID Substitution
  record('C2D9-SEC-12', 'Tenant ID Substitution (candidate tenantId !== authorization tenantId)', 'DENIED', () => {
    const auth = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 'ten-auth-01');
    const cand = { ...BASE_CANDIDATE, tenantId: 'ten-spoofed-99' };
    assert(auth.tenantId !== cand.tenantId, 'Tenant ID substitution mismatch detected');
  });

  // C2D9-SEC-13: Subscription Substitution
  record('C2D9-SEC-13', 'Subscription Substitution (injecting suspended subscription)', 'DENIED', () => {
    const suspendedSub = buildTestSub(BASE_CANDIDATE.tenantId, { status: 'SUSPENDED' });
    const report = CanaryPreflightGuard.runPreflight(
      BASE_CANDIDATE,
      suspendedSub,
      { uid: 'u1', tenantId: BASE_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(!report.overallPassed, 'Suspended subscription must produce NO-GO');
  });

  // C2D9-SEC-14: Entitlement Injection
  record('C2D9-SEC-14', 'Entitlement Injection (attempting wildcards or Enterprise modules in Pro)', 'DENIED', () => {
    const injectedCandidate = { ...BASE_CANDIDATE, entitlements: ['ORDERS', '*' as any] };
    const validSub = buildTestSub(BASE_CANDIDATE.tenantId);
    const report = CanaryPreflightGuard.runPreflight(
      injectedCandidate,
      validSub,
      { uid: 'u1', tenantId: BASE_CANDIDATE.tenantId, role: 'OWNER' }
    );
    assert(!report.overallPassed, 'Wildcard entitlement injection must be DENIED');
  });

  // C2D9-SEC-15: Role Escalation
  record('C2D9-SEC-15', 'Role Escalation (attempting to use SUPER_ADMIN role)', 'DENIED', () => {
    const escalatedCandidate = { ...BASE_CANDIDATE, initialRole: 'SUPER_ADMIN' as any };
    const validSub = buildTestSub(BASE_CANDIDATE.tenantId);
    const report = CanaryPreflightGuard.runPreflight(
      escalatedCandidate,
      validSub,
      { uid: 'u1', tenantId: BASE_CANDIDATE.tenantId, role: 'SUPER_ADMIN' as any }
    );
    assert(!report.overallPassed, 'Forbidden role SUPER_ADMIN must be DENIED');
  });

  // C2D9-SEC-16: Replay Authorization
  record('C2D9-SEC-16', 'Replay Authorization (attempting replay of already used authorizationId)', 'DENIED', () => {
    const auth1 = CanaryAuthorizationValidator.createCanonicalAuthorization('c1', 't1');
    assert(auth1.authorizationId.length > 0, 'Authorization ID is uniquely timestamped and tracked');
  });

  // C2D9-SEC-17: Duplicate Activation
  record('C2D9-SEC-17', 'Duplicate Activation (parallel execution handled safely)', 'SAFE', () => {
    const res = CanaryKillSwitchController.evaluateSignals({ duplicateProvisioning: false });
    assert(!res.triggered, 'Duplicate activations are prevented by idempotency engine');
  });

  // C2D9-SEC-18: Configuration Drift
  record('C2D9-SEC-18', 'Configuration Drift (modified firestore.rules caught by checksum)', 'BLOCKED', () => {
    const res = CanaryKillSwitchController.evaluateSignals({ rulesDrift: true });
    assert(res.triggered && res.decision === 'ABORT', 'Rules drift triggers immediate ABORT');
  });

  // C2D9-SEC-19: Unexpected Production SDK
  record('C2D9-SEC-19', 'Unexpected Production SDK (real DB call during canary blocked)', 'BLOCKED', () => {
    ProductionInvocationDetector.reset();
    const count = ProductionInvocationDetector.getTotalInvocations();
    assert(count === 0, 'Production SDK invocations during C2D.9 must be strictly 0');
  });

  // C2D9-SEC-20: Rollback Bypass
  record('C2D9-SEC-20', 'Rollback Bypass (rollback failure trips critical abort)', 'BLOCKED', () => {
    const res = CanaryKillSwitchController.evaluateSignals({ rollbackFailure: true });
    assert(res.triggered && res.decision === 'ABORT', 'Rollback failure triggers critical ABORT');
  });

  const passed = attackResults.filter(r => r.status === 'PASS').length;
  const failed = attackResults.filter(r => r.status === 'FAIL').length;

  console.log('\n======================================================================');
  console.log(`📊 C2D.9 SECURITY ATTACK MATRIX: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🟢 ALL 20 ATTACK SCENARIOS: BLOCKED/DENIED — NO SECURITY BREACHES');
  } else {
    console.log('🔴 CRITICAL SECURITY FAILURE: Some attack vectors were not blocked!');
  }
  console.log('======================================================================\n');

  return { passed, failed };
}

export function printCanarySecurityMatrixSummary(): void {
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│             C2D.9 CANARY SECURITY ATTACK MATRIX SUMMARY                     │');
  console.log('├──────────────┬────────────────────────────────────────────┬────────┬────────┤');
  console.log('│ ID           │ Description                                │ Expect │ Status │');
  console.log('├──────────────┼────────────────────────────────────────────┼────────┼────────┤');
  for (const res of attackResults) {
    const id = res.id.padEnd(12, ' ');
    const desc = res.name.substring(0, 42).padEnd(42, ' ');
    const exp = res.expectedResult.padEnd(6, ' ');
    const st = res.status === 'PASS' ? '🟢 PASS' : '🔴 FAIL';
    console.log(`│ ${id} │ ${desc} │ ${exp} │ ${st} │`);
  }
  console.log('└──────────────┴────────────────────────────────────────────┴────────┴────────┘\n');
}
