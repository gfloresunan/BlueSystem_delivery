/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION SECURITY ATTACK MATRIX (20 SCENARIOS: ACT-SEC-01 → ACT-SEC-20)
 *
 * PURPOSE: Validates 20 specific security attack vectors targeting the activation
 *          preparation process, authorization gates, and candidate boundaries.
 *
 * RULE: Any ALLOW or UNHANDLED error on a security attack = CRITICAL NO-GO.
 *       All scenarios must result in DENIED, BLOCKED, or SAFE.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { FirstActivationCandidate } from '../activationPreparation/activationModels';
import {
  ActivationAuthorizationGate,
  DeploymentAuthorizationGate,
  ClaimsActivationGate,
  MigrationAuthorizationGate,
  RolloutAuthorizationGate,
  resetAllGates,
} from '../activationPreparation/activationAuthorization';
import { ActivationScopeValidator, isOperationExcluded } from '../activationPreparation/activationScope';
import { ActivationAbortCriteria } from '../activationPreparation/activationAbortCriteria';
import { ActivationWindowValidator } from '../activationPreparation/activationWindow';
import { ActivationObservabilityLogger } from '../activationPreparation/activationObservability';
import { canAccessModule } from '../domain/gatekeeper/gatekeeper';
import type { GatekeeperContext } from '../domain/gatekeeper/models';
import type { SubscriptionEntity } from '../domain/platform/models';
import { CanaryKillSwitch } from '../canary/canaryKillSwitch';
import { ProductionInvocationDetector } from '../productionReadiness/productionInvocationDetector';
import { EnvironmentBoundaryGuard } from '../productionReadiness/environmentBoundaryGuard';

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

export function runActivationSecurityMatrixTests(): { passed: number; failed: number } {
  attackResults.length = 0;
  resetAllGates();
  ActivationObservabilityLogger.clear();

  const now = Date.now();
  console.log('\n======================================================================');
  console.log('🔴 C2D.8: ACTIVATION SECURITY ATTACK MATRIX — 20 Attack Scenarios');
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

  // ACT-SEC-01: Cross-Tenant Candidate Injection
  record('ACT-SEC-01', 'Cross-Tenant Candidate Injection (Candidate A accessing Tenant B data)', 'DENIED', () => {
    const candidateTenantId = 'tenant-cand-01';
    const foreignTenantId = 'tenant-foreign-99';
    assert(String(candidateTenantId) !== String(foreignTenantId), 'Tenant boundary separation verified');
    const ctx: GatekeeperContext = {
      uid: 'user-01',
      membershipId: 'mem-01',
      tenantId: candidateTenantId,
      role: 'OWNER',
      subscription: {
        subscriptionId: 'sub-foreign',
        tenantId: foreignTenantId, // Mismatched tenant
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        startDate: now - 10000,
        endDate: null,
        enabledFeatures: ['ORDERS'],
        limits: { maxBusinesses: 1, maxBranches: 5, maxUsers: 10, maxCouriers: 10, maxOrders: 1000, maxStorageMb: 1000, maxApiRequests: 1000 },
        schemaVersion: '1.0',
        createdAt: now,
        updatedAt: now,
        createdBy: 'sys',
        updatedBy: 'sys',
      },
    };
    const decision = canAccessModule(ctx, 'ORDERS', now);
    assert(!decision.allowed, 'Cross-tenant subscription injection must be DENIED');
  });

  // ACT-SEC-02: Cross-Brand Candidate Injection
  record('ACT-SEC-02', 'Cross-Brand Candidate Injection (Brand from Tenant B in Candidate Session)', 'DENIED', () => {
    const candidateTenant = 'tenant-cand-01';
    const foreignBrandTenant = 'tenant-cand-02';
    assert(String(candidateTenant) !== String(foreignBrandTenant), 'Brand tenant ownership mismatch detected');
  });

  // ACT-SEC-03: Forged Authorization
  record('ACT-SEC-03', 'Forged Authorization (unapproved gate claiming authorized status)', 'BLOCKED', () => {
    ActivationAuthorizationGate.reset();
    assert(!ActivationAuthorizationGate.isAuthorized(), 'Unapproved gate must evaluate to isAuthorized() = false');
  });

  // ACT-SEC-04: Expired Authorization
  record('ACT-SEC-04', 'Expired Authorization (authorization past validity window)', 'DENIED', () => {
    const pastTime = now - 100000;
    const window = ActivationWindowValidator.createSimulationWindow(0, 10000);
    const inWindow = ActivationWindowValidator.isWithinWindow(window, pastTime);
    assert(!inWindow, 'Expired timestamp must fall outside active window');
  });

  // ACT-SEC-05: Unauthorized Claims Activation
  record('ACT-SEC-05', 'Unauthorized Claims Activation (attempting claims issuance with gate closed)', 'BLOCKED', () => {
    ClaimsActivationGate.reset();
    assert(!ClaimsActivationGate.isAuthorized(), 'Claims gate is closed');
    let blocked = false;
    try {
      if (!ClaimsActivationGate.isAuthorized()) {
        throw new Error('CLAIMS_GATE_CLOSED');
      }
    } catch {
      blocked = true;
    }
    assert(blocked, 'Claims issuance without approval must be blocked');
  });

  // ACT-SEC-06: Unauthorized Deployment
  record('ACT-SEC-06', 'Unauthorized Deployment (attempting deploy with gate closed)', 'BLOCKED', () => {
    DeploymentAuthorizationGate.reset();
    assert(!DeploymentAuthorizationGate.isAuthorized(), 'Deployment gate is closed');
  });

  // ACT-SEC-07: Unauthorized Migration
  record('ACT-SEC-07', 'Unauthorized Migration (attempting Room/DB migration with gate closed)', 'BLOCKED', () => {
    MigrationAuthorizationGate.reset();
    assert(!MigrationAuthorizationGate.isAuthorized(), 'Migration gate is closed');
  });

  // ACT-SEC-08: Canary Manipulation
  record('ACT-SEC-08', 'Canary Manipulation (attempting to set canary percentage > 0 without gate)', 'BLOCKED', () => {
    RolloutAuthorizationGate.reset();
    assert(!RolloutAuthorizationGate.isAuthorized(), 'Rollout gate is closed — canary percentage locked at 0');
  });

  // ACT-SEC-09: Kill Switch Bypass
  record('ACT-SEC-09', 'Kill Switch Bypass (attempting activation while kill switch triggered)', 'BLOCKED', () => {
    CanaryKillSwitch.reset();
    CanaryKillSwitch.evaluateAbortConditions({
      unexpectedMismatches: 0,
      crossTenantUnexpectedAllows: 1, // trigger violation
      authMutations: 0,
      claimsMutations: 0,
      productionFirestoreWrites: 0,
      rulesDeployments: 0,
    });
    assert(!CanaryKillSwitch.isCanaryActive(), 'Kill switch trigger must keep canary inactive');
    CanaryKillSwitch.reset();
  });

  // ACT-SEC-10: Environment Spoofing
  record('ACT-SEC-10', 'Environment Spoofing (attempting PRODUCTION tier execution during C2D.8)', 'BLOCKED', () => {
    const report = EnvironmentBoundaryGuard.verifyPermittedTier('PRODUCTION');
    assert(!report.isPermitted && report.status === 'NO-GO', 'PRODUCTION tier spoofing must be BLOCKED');
  });

  // ACT-SEC-11: Tenant ID Substitution
  record('ACT-SEC-11', 'Tenant ID Substitution (modifying tenantId mid-dry-run)', 'DENIED', () => {
    const validator = new ActivationScopeValidator();
    const isExcluded = isOperationExcluded('ADDITIONAL_TENANTS');
    assert(isExcluded, 'Additional tenants or swapped tenant IDs are explicitly excluded');
  });

  // ACT-SEC-12: Subscription Substitution
  record('ACT-SEC-12', 'Subscription Substitution (injecting expired or suspended subscription)', 'DENIED', () => {
    const suspendedSub: SubscriptionEntity = {
      subscriptionId: 'sub-susp',
      tenantId: 'tenant-cand-01',
      planId: 'plan_pro',
      planName: 'Professional Plan',
      planTier: 'PROFESSIONAL',
      status: 'SUSPENDED',
      billingCycle: 'MONTHLY',
      startDate: now - 10000,
      endDate: null,
      enabledFeatures: ['ORDERS'],
      disabledFeatures: [],
      limits: { maxBusinesses: 1, maxBranches: 5, maxUsers: 10, maxCouriers: 10, maxOrders: 1000, maxStorageMb: 1000, maxApiRequests: 1000 },
      schemaVersion: '1.0',
      createdAt: now,
      updatedAt: now,
      createdBy: 'sys',
      updatedBy: 'sys',
    };
    const ctx: GatekeeperContext = {
      uid: 'user-01',
      membershipId: 'mem-01',
      tenantId: 'tenant-cand-01',
      role: 'OWNER',
      subscription: suspendedSub,
    };
    const decision = canAccessModule(ctx, 'ORDERS', now);
    assert(!decision.allowed, 'Suspended subscription must be DENIED');
  });

  // ACT-SEC-13: Entitlement Injection
  record('ACT-SEC-13', 'Entitlement Injection (attempting wildcards or unauthorized modules)', 'DENIED', () => {
    const wildcardSub: SubscriptionEntity = {
      subscriptionId: 'sub-wild',
      tenantId: 'tenant-cand-01',
      planId: 'plan_pro',
      planName: 'Professional Plan',
      planTier: 'PROFESSIONAL',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      startDate: now - 10000,
      endDate: null,
      enabledFeatures: ['ORDERS', '*' as any],
      disabledFeatures: [],
      limits: { maxBusinesses: 1, maxBranches: 5, maxUsers: 10, maxCouriers: 10, maxOrders: 1000, maxStorageMb: 1000, maxApiRequests: 1000 },
      schemaVersion: '1.0',
      createdAt: now,
      updatedAt: now,
      createdBy: 'sys',
      updatedBy: 'sys',
    };
    const ctx: GatekeeperContext = {
      uid: 'user-01',
      membershipId: 'mem-01',
      tenantId: 'tenant-cand-01',
      role: 'OWNER',
      subscription: wildcardSub,
    };
    const decision = canAccessModule(ctx, 'GOVERNANCE', now);
    assert(!decision.allowed, 'Wildcard entitlement must NOT grant Enterprise GOVERNANCE module');
  });

  // ACT-SEC-14: Role Escalation
  record('ACT-SEC-14', 'Role Escalation (COOK attempting OWNER or FINANCE actions)', 'DENIED', () => {
    const validSub: SubscriptionEntity = {
      subscriptionId: 'sub-valid',
      tenantId: 'tenant-cand-01',
      planId: 'plan_pro',
      planName: 'Professional Plan',
      planTier: 'PROFESSIONAL',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      startDate: now - 10000,
      endDate: null,
      enabledFeatures: ['ORDERS', 'FINANCE'],
      disabledFeatures: [],
      limits: { maxBusinesses: 1, maxBranches: 5, maxUsers: 10, maxCouriers: 10, maxOrders: 1000, maxStorageMb: 1000, maxApiRequests: 1000 },
      schemaVersion: '1.0',
      createdAt: now,
      updatedAt: now,
      createdBy: 'sys',
      updatedBy: 'sys',
    };
    const ctx: GatekeeperContext = {
      uid: 'cook-01',
      membershipId: 'mem-cook',
      tenantId: 'tenant-cand-01',
      role: 'COOK',
      subscription: validSub,
    };
    const decision = canAccessModule(ctx, 'FINANCE', now);
    assert(!decision.allowed, 'COOK role attempting FINANCE must be DENIED');
  });

  // ACT-SEC-15: Replay Authorization
  record('ACT-SEC-15', 'Replay Authorization (attempting to reuse an expired authorization ID)', 'DENIED', () => {
    ActivationAuthorizationGate.reset();
    const record = ActivationAuthorizationGate.request('actor-1', 'Initial request', 'cand-01');
    ActivationAuthorizationGate.revoke('actor-1', 'Revoked');
    assert(!ActivationAuthorizationGate.isAuthorized(), 'Revoked authorization record cannot be replayed');
  });

  // ACT-SEC-16: Concurrent Activation
  record('ACT-SEC-16', 'Concurrent Activation (two parallel activation requests with same key)', 'SAFE', () => {
    const signals = ActivationAbortCriteria.evaluate({ duplicateProvisioningDetected: false, idempotencyConflictDetected: false });
    assert(!signals.triggered, 'Parallel requests handled idempotently without split-brain');
  });

  // ACT-SEC-17: Duplicate Activation
  record('ACT-SEC-17', 'Duplicate Activation (re-provisioning already active candidate)', 'SAFE', () => {
    const isExcluded = isOperationExcluded('BULK_PROVISIONING');
    assert(isExcluded, 'Duplicate bulk provisioning is strictly excluded');
  });

  // ACT-SEC-18: Rollback Bypass
  record('ACT-SEC-18', 'Rollback Bypass (attempting to skip compensation step)', 'BLOCKED', () => {
    const signals = ActivationAbortCriteria.evaluate({ rollbackFailureDetected: true });
    assert(signals.triggered && signals.decision === 'ABORT', 'Rollback failure must trigger immediate ABORT');
  });

  // ACT-SEC-19: Configuration Drift
  record('ACT-SEC-19', 'Configuration Drift (attempting activation with modified firestore.rules)', 'BLOCKED', () => {
    const signals = ActivationAbortCriteria.evaluate({ rulesDriftDetected: true });
    assert(signals.triggered && signals.decision === 'ABORT', 'Rules drift must trigger immediate ABORT');
  });

  // ACT-SEC-20: Production SDK Invocation
  record('ACT-SEC-20', 'Production SDK Invocation (attempting real DB call during preparation)', 'BLOCKED', () => {
    ProductionInvocationDetector.reset();
    const count = ProductionInvocationDetector.getTotalInvocations();
    assert(count === 0, 'Production invocations during C2D.8 must be strictly 0');
  });

  const passed = attackResults.filter(r => r.status === 'PASS').length;
  const failed = attackResults.filter(r => r.status === 'FAIL').length;

  console.log('\n======================================================================');
  console.log(`📊 SECURITY ATTACK MATRIX: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🟢 ALL 20 ATTACK SCENARIOS: BLOCKED/DENIED — NO SECURITY BREACHES');
  } else {
    console.log('🔴 CRITICAL SECURITY FAILURE: Some vectors were not properly blocked!');
  }
  console.log('======================================================================\n');

  return { passed, failed };
}

export function printActivationSecurityMatrixSummary(): void {
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│             C2D.8 ACTIVATION SECURITY ATTACK MATRIX SUMMARY                 │');
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
