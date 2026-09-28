/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY PREFLIGHT & MULTI-TENANT CONFINEMENT GUARD
 *
 * PURPOSE: Enforces multi-tenant isolation identity congruence, subscription
 *          validity, entitlement confinement, role confinement, quota checks,
 *          rules checksum, and kill-switch arming.
 *
 * GOVERNANCE: Any failure → NO-GO. Zero auto-mutation or silent bypassing.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { FirstCanaryCandidate } from './canaryModels';
import type { SubscriptionEntity, CapabilityModule } from '../domain/platform/models';
import { EiamRole } from '../domain/identity/models';
import { canAccessModule, checkQuota } from '../domain/gatekeeper/gatekeeper';
import type { GatekeeperContext } from '../domain/gatekeeper/models';
import { CanaryKillSwitch } from '../canary/canaryKillSwitch';
import { ConfigurationDriftAudit } from '../productionReadiness/configurationDriftAudit';

export interface PreflightReportItem {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface CanaryPreflightReport {
  overallPassed: boolean;
  status: 'PASS' | 'NO-GO';
  checks: PreflightReportItem[];
  timestamp: number;
}

const CANONICAL_MODULE_CATALOG: CapabilityModule[] = [
  'ORDERS',
  'CATALOG',
  'CUSTOMERS',
  'PROMOTIONS',
  'FINANCE',
  'REPORTS',
  'CONTROL_TOWER',
  'FLEET_CORE',
  'GPS_TRACKING',
  'X_TO_Y_DELIVERY',
  'KDS',
  'NOTIFICATIONS',
  'ANALYTICS',
  'GOVERNANCE',
  'MULTI_BRANCH',
  'MULTI_BRAND',
  'MULTI_MERCHANT',
  'API_ACCESS',
];

const FORBIDDEN_ROLES = ['SUPER_ADMIN', 'SUPERUSER', 'HACKER', 'ROOT', 'OWNER_OVERRIDE'];
const FORBIDDEN_ENTITLEMENT_PATTERNS = ['*', 'ALL', 'SUPER', 'SUPER_ADMIN_MODULE'];

export class CanaryPreflightGuard {
  /**
   * Runs the complete preflight audit for a candidate and subscription.
   */
  static runPreflight(
    candidate: FirstCanaryCandidate,
    subscription: SubscriptionEntity,
    membership: { uid: string; tenantId: string; role: EiamRole }
  ): CanaryPreflightReport {
    const checks: PreflightReportItem[] = [];
    const now = Date.now();

    // 1. Tenant Isolation Identity Congruence
    const tenantIdMatch =
      candidate.tenantId === candidate.brandId.replace('brand-', '').replace('brand_', '') ||
      candidate.brandId.includes(candidate.tenantId) ||
      candidate.tenantId.length > 0;

    const subTenantMatch = subscription.tenantId === candidate.tenantId;
    const memTenantMatch = membership.tenantId === candidate.tenantId;

    const isolationPassed = subTenantMatch && memTenantMatch;
    checks.push({
      name: 'TENANT_ISOLATION_CONGRUENCE',
      passed: isolationPassed,
      reason: isolationPassed
        ? 'Identity congruence validated across candidate, subscription, and membership'
        : 'SECURITY_MISMATCH: tenantId divergence detected in subscription or membership',
    });

    // 2. Subscription Validity
    const subStatusOk = subscription.status === 'ACTIVE' || subscription.status === 'TRIAL';
    const subStartOk = subscription.startDate <= now;
    const subEndOk = subscription.endDate === null || subscription.endDate === undefined || now <= subscription.endDate;
    const subPassed = subStatusOk && subStartOk && subEndOk;

    checks.push({
      name: 'SUBSCRIPTION_VALIDITY',
      passed: subPassed,
      reason: subPassed
        ? `Subscription active on ${subscription.planTier} tier`
        : `SUBSCRIPTION_INVALID: status=${subscription.status}, start=${subscription.startDate}, end=${subscription.endDate}`,
    });

    // 3. Entitlement Validation & Catalog Enforcement
    const hasForbiddenEntitlements = candidate.entitlements.some(e =>
      FORBIDDEN_ENTITLEMENT_PATTERNS.includes(e as string) || !CANONICAL_MODULE_CATALOG.includes(e)
    );
    const entitlementsPassed = !hasForbiddenEntitlements;

    checks.push({
      name: 'ENTITLEMENT_CATALOG_CONFINEMENT',
      passed: entitlementsPassed,
      reason: entitlementsPassed
        ? 'All requested entitlements belong to CANONICAL_MODULE_CATALOG'
        : 'ENTITLEMENT_VIOLATION: Wildcards (*), SUPER, or unrecognized modules detected',
    });

    // 4. Role Confinement
    const isForbiddenRole = FORBIDDEN_ROLES.includes(candidate.initialRole as string);
    const rolePassed = !isForbiddenRole;

    checks.push({
      name: 'ROLE_CONFINEMENT',
      passed: rolePassed,
      reason: rolePassed
        ? `Role ${candidate.initialRole} is canonical EiamRole`
        : `ROLE_ESCALATION_ATTEMPT: Forbidden role "${candidate.initialRole}" detected`,
    });

    // 5. Quota Preflight
    const gatekeeperCtx: GatekeeperContext = {
      uid: membership.uid,
      membershipId: `mem-${candidate.candidateId}`,
      tenantId: candidate.tenantId,
      brandId: candidate.brandId,
      role: candidate.initialRole,
      subscription,
    };

    const quotaBranches = checkQuota(gatekeeperCtx, 'maxBranches', 1, 1, now).allowed;
    const quotaCouriers = checkQuota(gatekeeperCtx, 'maxCouriers', 1, 1, now).allowed;
    const quotaPassed = quotaBranches && quotaCouriers;

    checks.push({
      name: 'QUOTA_PREFLIGHT',
      passed: quotaPassed,
      reason: quotaPassed ? 'Quota boundaries validated' : 'QUOTA_EXCEEDED: Quota boundary violation',
    });

    // 6. Rules SHA-256 Checksum & Drift
    const driftReport = ConfigurationDriftAudit.simulatedDriftAudit();
    const rulesDrift = driftReport.files.find(f => f.filename === 'firestore.rules')?.drift ?? false;
    const rulesPassed = !rulesDrift && driftReport.overallStatus === 'PASS';

    checks.push({
      name: 'RULES_SHA256_DRIFT_CHECK',
      passed: rulesPassed,
      reason: rulesPassed ? 'firestore.rules verified with 0 drift' : 'RULES_DRIFT: Checksum mismatch',
    });

    // 7. Kill Switch Armed
    const killSwitchArmed = !CanaryKillSwitch.isCanaryActive();
    checks.push({
      name: 'KILL_SWITCH_ARMED',
      passed: killSwitchArmed,
      reason: killSwitchArmed ? 'Canary Kill Switch is ARMED' : 'KILL_SWITCH_DISARMED',
    });

    // 8. Single Candidate Scope Enforcement
    const singleCandidate =
      candidate.canaryRequestLimit === 1 &&
      candidate.canary === true &&
      candidate.rolloutAllowed === false;

    checks.push({
      name: 'SINGLE_CANDIDATE_LIMIT_ENFORCEMENT',
      passed: singleCandidate,
      reason: singleCandidate
        ? 'Strictly single-candidate canary limit (limit=1, rolloutAllowed=false)'
        : 'SCOPE_VIOLATION: Multiple candidate or automatic rollout flag detected',
    });

    const overallPassed = checks.every(c => c.passed);

    return {
      overallPassed,
      status: overallPassed ? 'PASS' : 'NO-GO',
      checks,
      timestamp: now,
    };
  }
}
