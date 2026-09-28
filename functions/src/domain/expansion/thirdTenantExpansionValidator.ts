/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.21
 * THIRD TENANT CONTROLLED EXPANSION AUTHORIZATION VALIDATOR (C2D.21)
 * 
 * Architecture: ONE CORE / ONE CODEBASE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND / WHITE-LABEL
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Protocol: C2D.21 (LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION for Tenant 03)
 * Invariants:
 *   CERTIFICATION ≠ AUTHORIZATION
 *   AUTHORIZATION ≠ EXECUTION
 *   EXECUTION ≠ EXPANSION
 *   CANARY SUCCESS ≠ CANARY EXPANSION
 *   TENANT 03 SUCCESS ≠ TENANT 04 AUTHORIZATION
 *   LEVEL_6 ≠ LEVEL_7
 */

import { ProductionAuthorizationLevel } from '../humanAuthorization/humanAuthorizationValidator';

export interface ThirdTenantTargetScope {
  readonly tenantId: string;
  readonly brandId: string;
  readonly organizationId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly administratorUid: string;
}

export interface ThirdTenantScopeBounds {
  readonly additionalTenants: number;
  readonly targetTotalActiveTenants: number;
  readonly additionalBrands: number;
  readonly additionalOrganizations: number;
  readonly additionalBusinesses: number;
  readonly additionalBranches: number;
  readonly additionalAdmins: number;
}

export interface ThirdTenantSubscriptionScope {
  readonly subscriptionPlan: string;
  readonly authorizedModules: string[];
}

export interface ThirdTenantCanaryLimits {
  readonly authorized: boolean;
  readonly maxRequests: number;
  readonly maxPercentage: number;
}

export interface ThirdTenantIndependentGates {
  readonly deploymentAuthorized: boolean;
  readonly claimsAuthorized: boolean;
  readonly migrationAuthorized: boolean;
  readonly provisioningAuthorized: boolean;
  readonly canaryAuthorized: boolean;
  readonly canaryExpansionAuthorized: boolean;
  readonly rolloutAuthorized: boolean;
  readonly massProvisioningAuthorized: boolean;
  readonly massClaimsAuthorized: boolean;
  readonly level7Authorized: boolean;
}

export interface ThirdTenantGovernanceGuards {
  readonly killSwitchRequired: boolean;
  readonly rollbackRequired: boolean;
  readonly humanDecisionAfterCanaryRequired: boolean;
}

export interface ThirdTenantAuthorizationPackage {
  readonly authorizationId: string;
  readonly authorizationVersion: string;
  readonly authorizationTimestamp: number;
  readonly expirationTimestamp: number;
  readonly authorizedBy: string;
  readonly authorizationReason: string;
  readonly authorizationType: 'CONTROLLED_EXPANSION';
  readonly authorizationLevel: ProductionAuthorizationLevel.LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION;
  readonly status: 'HUMAN_AUTHORIZED';
  readonly environment: 'PRODUCTION' | 'TEST' | 'LOCAL';
  readonly firebaseProjectId: string;
  readonly scopeBounds: ThirdTenantScopeBounds;
  readonly targetScope: ThirdTenantTargetScope;
  readonly subscription: ThirdTenantSubscriptionScope;
  readonly canary: ThirdTenantCanaryLimits;
  readonly independentGates: ThirdTenantIndependentGates;
  readonly governanceGuards: ThirdTenantGovernanceGuards;
  readonly scopeHash: string;
  readonly authorizationSignature: string;
}

export interface ThirdTenantValidationResult {
  readonly isValid: boolean;
  readonly violationCode?: string;
  readonly reason?: string;
  readonly missingFields?: string[];
}

export class ThirdTenantExpansionValidator {
  private static readonly EXISTING_TENANT_IDS = new Set(['ten-live-commercial-01', 'ten-live-commercial-02']);
  private static readonly EXISTING_BRAND_IDS = new Set(['brand-live-commercial-01', 'brand-live-commercial-02']);
  private static readonly EXISTING_ADMIN_UIDS = new Set(['usr-live-admin-01', 'usr-live-admin-02']);

  /**
   * Validates all requirements of LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION for Tenant 03 (C2D.21).
   */
  static validate(
    auth: Partial<ThirdTenantAuthorizationPackage>,
    now: number = Date.now(),
    consumedAuthIds: Set<string> = new Set()
  ): ThirdTenantValidationResult {
    const missing: string[] = [];

    if (!auth.authorizationId || auth.authorizationId.trim().length === 0) missing.push('authorizationId');
    if (!auth.authorizationVersion || auth.authorizationVersion.trim().length === 0) missing.push('authorizationVersion');
    if (!auth.authorizedBy || auth.authorizedBy.trim().length === 0) missing.push('authorizedBy');
    if (!auth.authorizationReason || auth.authorizationReason.trim().length === 0) missing.push('authorizationReason');
    if (auth.authorizationType !== 'CONTROLLED_EXPANSION') missing.push('authorizationType');
    if (typeof auth.authorizationTimestamp !== 'number' || auth.authorizationTimestamp <= 0) missing.push('authorizationTimestamp');
    if (typeof auth.expirationTimestamp !== 'number' || auth.expirationTimestamp <= 0) missing.push('expirationTimestamp');
    if (!auth.authorizationLevel) missing.push('authorizationLevel');
    if (auth.status !== 'HUMAN_AUTHORIZED') missing.push('status');
    if (!auth.environment) missing.push('environment');
    if (!auth.firebaseProjectId || auth.firebaseProjectId.trim().length === 0) missing.push('firebaseProjectId');
    if (!auth.scopeBounds) missing.push('scopeBounds');
    if (!auth.targetScope) missing.push('targetScope');
    if (!auth.subscription) missing.push('subscription');
    if (!auth.canary) missing.push('canary');
    if (!auth.independentGates) missing.push('independentGates');
    if (!auth.governanceGuards) missing.push('governanceGuards');
    if (!auth.scopeHash || auth.scopeHash.trim().length === 0) missing.push('scopeHash');
    if (!auth.authorizationSignature || auth.authorizationSignature.trim().length === 0) missing.push('authorizationSignature');

    if (missing.length > 0) {
      return {
        isValid: false,
        violationCode: 'MISSING_FIELDS',
        reason: `Missing required fields: [${missing.join(', ')}]`,
        missingFields: missing
      };
    }

    // 1. Replay Protection
    if (consumedAuthIds.has(auth.authorizationId!)) {
      return {
        isValid: false,
        violationCode: 'REPLAYED_AUTHORIZATION',
        reason: 'Authorization ID has already been consumed (replay rejected)'
      };
    }

    // 2. Validity Window
    if (auth.expirationTimestamp! <= auth.authorizationTimestamp!) {
      return {
        isValid: false,
        violationCode: 'INVALID_VALIDITY_WINDOW',
        reason: 'expirationTimestamp must be strictly greater than authorizationTimestamp'
      };
    }

    if (now < auth.authorizationTimestamp! || now > auth.expirationTimestamp!) {
      return {
        isValid: false,
        violationCode: 'EXPIRED_AUTHORIZATION_WINDOW',
        reason: 'Current timestamp outside authorized validity window'
      };
    }

    // 3. Level Check (Must be LEVEL_6)
    if (auth.authorizationLevel !== ProductionAuthorizationLevel.LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION) {
      return {
        isValid: false,
        violationCode: 'INVALID_AUTHORIZATION_LEVEL',
        reason: `Expected LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION but received ${auth.authorizationLevel}`
      };
    }

    // 4. Environment Check
    if (auth.environment !== 'PRODUCTION') {
      return {
        isValid: false,
        violationCode: 'ENVIRONMENT_MISMATCH',
        reason: 'Environment must match PRODUCTION for live expansion'
      };
    }

    // 5. Scope Bounds Check
    const bounds = auth.scopeBounds!;
    if (bounds.additionalTenants !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_TENANTS',
        reason: 'additionalTenants must be strictly equal to 1'
      };
    }
    if (bounds.targetTotalActiveTenants !== 3) {
      return {
        isValid: false,
        violationCode: 'INVALID_TARGET_TOTAL_ACTIVE_TENANTS',
        reason: 'targetTotalActiveTenants must be strictly equal to 3'
      };
    }
    if (bounds.additionalBrands !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_BRANDS',
        reason: 'additionalBrands must be strictly equal to 1'
      };
    }
    if (bounds.additionalOrganizations !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_ORGS',
        reason: 'additionalOrganizations must be strictly equal to 1'
      };
    }
    if (bounds.additionalBusinesses !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_BUSINESSES',
        reason: 'additionalBusinesses must be strictly equal to 1'
      };
    }
    if (bounds.additionalBranches !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_BRANCHES',
        reason: 'additionalBranches must be strictly equal to 1'
      };
    }
    if (bounds.additionalAdmins !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_ADMINS',
        reason: 'additionalAdmins must be strictly equal to 1'
      };
    }

    // 6. Target Scope & Collision Checks
    const ts = auth.targetScope!;
    if (!ts.tenantId || ts.tenantId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_TENANT_ID', reason: 'tenantId is required' };
    if (!ts.brandId || ts.brandId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_BRAND_ID', reason: 'brandId is required' };
    if (!ts.organizationId || ts.organizationId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_ORG_ID', reason: 'organizationId is required' };
    if (!ts.businessId || ts.businessId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_BIZ_ID', reason: 'businessId is required' };
    if (!ts.branchId || ts.branchId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_BRANCH_ID', reason: 'branchId is required' };
    if (!ts.administratorUid || ts.administratorUid.trim().length === 0) return { isValid: false, violationCode: 'MISSING_ADMIN_UID', reason: 'administratorUid is required' };

    // Wildcards
    if (ts.tenantId === '*' || ts.brandId === '*' || ts.administratorUid === '*' || ts.organizationId === '*' || ts.businessId === '*' || ts.branchId === '*') {
      return { isValid: false, violationCode: 'WILDCARD_NOT_ALLOWED', reason: 'Wildcard identifiers are strictly forbidden' };
    }

    // Exact Canonical Target Target
    if (ts.tenantId !== 'ten-live-commercial-03') {
      return {
        isValid: false,
        violationCode: 'TARGET_TENANT_MISMATCH',
        reason: `Target tenantId must be ten-live-commercial-03 but received ${ts.tenantId}`
      };
    }

    // Collisions
    if (this.EXISTING_TENANT_IDS.has(ts.tenantId)) {
      return {
        isValid: false,
        violationCode: 'TENANT_COLLISION',
        reason: `Target tenant ${ts.tenantId} collides with existing fleet`
      };
    }
    if (this.EXISTING_BRAND_IDS.has(ts.brandId)) {
      return {
        isValid: false,
        violationCode: 'BRAND_COLLISION',
        reason: `Target brand ${ts.brandId} collides with existing fleet`
      };
    }
    if (this.EXISTING_ADMIN_UIDS.has(ts.administratorUid)) {
      return {
        isValid: false,
        violationCode: 'ADMIN_COLLISION',
        reason: `Target admin ${ts.administratorUid} collides with existing fleet`
      };
    }

    // 7. Canary Limits
    const canary = auth.canary!;
    if (!canary.authorized) {
      return { isValid: false, violationCode: 'CANARY_UNAUTHORIZED', reason: 'Canary must be authorized in expansion payload' };
    }
    if (canary.maxRequests > 10) {
      return { isValid: false, violationCode: 'CANARY_REQUESTS_OVERFLOW', reason: 'maxRequests must be <= 10' };
    }
    if (canary.maxPercentage > 0.01) {
      return { isValid: false, violationCode: 'CANARY_PERCENTAGE_OVERFLOW', reason: 'maxPercentage must be <= 0.01 (1%)' };
    }

    // 8. Independent Gates Lock
    const ig = auth.independentGates!;
    if (ig.rolloutAuthorized) return { isValid: false, violationCode: 'ROLLOUT_UNAUTHORIZED', reason: 'rolloutAuthorized cannot be TRUE in LEVEL_6' };
    if (ig.deploymentAuthorized) return { isValid: false, violationCode: 'DEPLOYMENT_GATE_UNAUTHORIZED', reason: 'deploymentAuthorized cannot be TRUE in LEVEL_6' };
    if (ig.migrationAuthorized) return { isValid: false, violationCode: 'MIGRATION_GATE_UNAUTHORIZED', reason: 'migrationAuthorized cannot be TRUE in LEVEL_6' };
    if (ig.canaryExpansionAuthorized) return { isValid: false, violationCode: 'CANARY_EXPANSION_UNAUTHORIZED', reason: 'canaryExpansionAuthorized cannot be TRUE in LEVEL_6' };
    if (ig.massProvisioningAuthorized) return { isValid: false, violationCode: 'MASS_PROV_UNAUTHORIZED', reason: 'massProvisioningAuthorized cannot be TRUE' };
    if (ig.massClaimsAuthorized) return { isValid: false, violationCode: 'MASS_CLAIMS_UNAUTHORIZED', reason: 'massClaimsAuthorized cannot be TRUE' };
    if (ig.level7Authorized) return { isValid: false, violationCode: 'LEVEL_7_UNAUTHORIZED', reason: 'LEVEL_7 cannot be authorized in LEVEL_6 payload' };

    // 9. Governance Guards
    const gg = auth.governanceGuards!;
    if (!gg.killSwitchRequired) return { isValid: false, violationCode: 'KILL_SWITCH_REQUIRED', reason: 'killSwitchRequired must be true' };
    if (!gg.rollbackRequired) return { isValid: false, violationCode: 'ROLLBACK_REQUIRED', reason: 'rollbackRequired must be true' };
    if (!gg.humanDecisionAfterCanaryRequired) return { isValid: false, violationCode: 'HUMAN_DECISION_REQUIRED', reason: 'humanDecisionAfterCanaryRequired must be true' };

    return { isValid: true };
  }
}
