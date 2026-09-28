/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.19
 * CONTROLLED EXPANSION AUTHORIZATION VALIDATOR & CONTRACTS (C2D.19)
 * 
 * Architecture: ONE CORE / ONE CODEBASE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND / WHITE-LABEL
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Protocol: C2D.19 (LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION)
 * Invariants:
 *   CERTIFICATION ≠ AUTHORIZATION
 *   AUTHORIZATION ≠ EXECUTION
 *   EXECUTION ≠ EXPANSION
 *   CANARY SUCCESS ≠ CANARY EXPANSION
 *   CANARY SUCCESS ≠ ROLLOUT
 *   LEVEL_6 ≠ LEVEL_7
 */

import { ProductionAuthorizationLevel } from '../humanAuthorization/humanAuthorizationValidator';

export interface ExpansionTargetScope {
  readonly tenantId: string;
  readonly brandId: string;
  readonly organizationId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly administratorUid: string;
}

export interface ExpansionScopeBounds {
  readonly additionalTenants: number;
  readonly totalActiveTenants: number;
  readonly additionalBrands: number;
  readonly additionalBusinesses: number;
  readonly additionalBranches: number;
  readonly additionalAdmins: number;
}

export interface ExpansionSubscriptionScope {
  readonly subscriptionPlan: string;
  readonly authorizedModules: string[];
}

export interface ExpansionCanaryLimits {
  readonly authorized: boolean;
  readonly maxRequests: number;
  readonly maxPercentage: number;
}

export interface ExpansionIndependentGates {
  readonly deploymentAuthorized: boolean;
  readonly claimsAuthorized: boolean;
  readonly migrationAuthorized: boolean;
  readonly provisioningAuthorized: boolean;
  readonly canaryAuthorized: boolean;
  readonly canaryExpansionAuthorized: boolean;
  readonly rolloutAuthorized: boolean;
  readonly massProvisioningAuthorized: boolean;
  readonly massClaimsAuthorized: boolean;
}

export interface ExpansionGovernanceGuards {
  readonly killSwitchRequired: boolean;
  readonly rollbackRequired: boolean;
  readonly humanDecisionAfterCanaryRequired: boolean;
}

export interface ControlledExpansionAuthorizationPackage {
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
  readonly scopeBounds: ExpansionScopeBounds;
  readonly targetScope: ExpansionTargetScope;
  readonly subscription: ExpansionSubscriptionScope;
  readonly canary: ExpansionCanaryLimits;
  readonly independentGates: ExpansionIndependentGates;
  readonly governanceGuards: ExpansionGovernanceGuards;
  readonly scopeHash: string;
  readonly authorizationSignature: string;
}

export interface ExpansionValidationResult {
  readonly isValid: boolean;
  readonly violationCode?: string;
  readonly reason?: string;
  readonly missingFields?: string[];
}

export class ControlledExpansionValidator {
  private static readonly EXISTING_TENANT_IDS = new Set(['ten-live-commercial-01']);
  private static readonly EXISTING_BRAND_IDS = new Set(['brand-live-commercial-01']);
  private static readonly EXISTING_ADMIN_UIDS = new Set(['usr-live-admin-01']);

  /**
   * Validates all requirements of LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION for C2D.19.
   * Fail-closed on any missing, invalid, out-of-scope or ambiguous field.
   */
  static validate(
    auth: Partial<ControlledExpansionAuthorizationPackage>,
    now: number = Date.now(),
    consumedAuthIds: Set<string> = new Set()
  ): ExpansionValidationResult {
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

    // 1. Uniqueness & Replay Protection Check
    if (consumedAuthIds.has(auth.authorizationId!)) {
      return {
        isValid: false,
        violationCode: 'REPLAYED_AUTHORIZATION',
        reason: 'Authorization ID has already been consumed and cannot be replayed'
      };
    }

    // 2. Validity Window Check
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

    // 3. Strict Authorization Level Validation (Must be strictly LEVEL_6)
    if (auth.authorizationLevel !== ProductionAuthorizationLevel.LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION) {
      return {
        isValid: false,
        violationCode: 'INVALID_AUTHORIZATION_LEVEL',
        reason: `Expected LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION but received ${auth.authorizationLevel}`
      };
    }

    // 4. Environment Validation
    if (auth.environment !== 'PRODUCTION') {
      return {
        isValid: false,
        violationCode: 'ENVIRONMENT_MISMATCH',
        reason: 'Environment must match PRODUCTION for live expansion'
      };
    }

    // 5. Scope Bounds Validation (Confinement to exactly +1 entity)
    const bounds = auth.scopeBounds!;
    if (bounds.additionalTenants !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_TENANTS',
        reason: 'additionalTenants must be strictly equal to 1'
      };
    }
    if (bounds.totalActiveTenants !== 2) {
      return {
        isValid: false,
        violationCode: 'INVALID_TOTAL_ACTIVE_TENANTS',
        reason: 'totalActiveTenants must be strictly equal to 2'
      };
    }
    if (bounds.additionalBrands !== 1) {
      return {
        isValid: false,
        violationCode: 'INVALID_ADDITIONAL_BRANDS',
        reason: 'additionalBrands must be strictly equal to 1'
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

    // 6. Target Scope Validation & Wildcard Rejection
    const ts = auth.targetScope!;
    if (!ts.tenantId || ts.tenantId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_TENANT_ID', reason: 'tenantId is required' };
    if (!ts.brandId || ts.brandId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_BRAND_ID', reason: 'brandId is required' };
    if (!ts.organizationId || ts.organizationId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_ORG_ID', reason: 'organizationId is required' };
    if (!ts.businessId || ts.businessId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_BIZ_ID', reason: 'businessId is required' };
    if (!ts.branchId || ts.branchId.trim().length === 0) return { isValid: false, violationCode: 'MISSING_BRANCH_ID', reason: 'branchId is required' };
    if (!ts.administratorUid || ts.administratorUid.trim().length === 0) return { isValid: false, violationCode: 'MISSING_ADMIN_UID', reason: 'administratorUid is required' };

    if (ts.tenantId === '*' || ts.brandId === '*' || ts.administratorUid === '*' || ts.organizationId === '*' || ts.businessId === '*' || ts.branchId === '*') {
      return { isValid: false, violationCode: 'WILDCARD_NOT_ALLOWED', reason: 'Wildcard identifiers are strictly forbidden' };
    }

    // 7. Existence & Collision Check
    if (this.EXISTING_TENANT_IDS.has(ts.tenantId)) {
      return {
        isValid: false,
        violationCode: 'TENANT_COLLISION',
        reason: `Target tenant ${ts.tenantId} collides with existing tenant (takeover prevented)`
      };
    }
    if (this.EXISTING_BRAND_IDS.has(ts.brandId)) {
      return {
        isValid: false,
        violationCode: 'BRAND_COLLISION',
        reason: `Target brand ${ts.brandId} collides with existing brand (takeover prevented)`
      };
    }
    if (this.EXISTING_ADMIN_UIDS.has(ts.administratorUid)) {
      return {
        isValid: false,
        violationCode: 'ADMIN_COLLISION',
        reason: `Target admin ${ts.administratorUid} collides with existing admin (takeover prevented)`
      };
    }

    // 8. Canary Limits Check
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

    // 9. Independent Gates Lock (Non-Transitivity: LEVEL_6 ≠ LEVEL_7, No Rollout, No Mass Ops)
    const ig = auth.independentGates!;
    if (ig.rolloutAuthorized) {
      return { isValid: false, violationCode: 'ROLLOUT_UNAUTHORIZED', reason: 'rolloutAuthorized cannot be TRUE in LEVEL_6 (ADR-014)' };
    }
    if (ig.deploymentAuthorized) {
      return { isValid: false, violationCode: 'DEPLOYMENT_GATE_UNAUTHORIZED', reason: 'deploymentAuthorized cannot be TRUE in LEVEL_6' };
    }
    if (ig.migrationAuthorized) {
      return { isValid: false, violationCode: 'MIGRATION_GATE_UNAUTHORIZED', reason: 'migrationAuthorized cannot be TRUE in LEVEL_6' };
    }
    if (ig.canaryExpansionAuthorized) {
      return { isValid: false, violationCode: 'CANARY_EXPANSION_UNAUTHORIZED', reason: 'canaryExpansionAuthorized cannot be TRUE in LEVEL_6' };
    }
    if (ig.massProvisioningAuthorized) {
      return { isValid: false, violationCode: 'MASS_PROV_UNAUTHORIZED', reason: 'massProvisioningAuthorized cannot be TRUE' };
    }
    if (ig.massClaimsAuthorized) {
      return { isValid: false, violationCode: 'MASS_CLAIMS_UNAUTHORIZED', reason: 'massClaimsAuthorized cannot be TRUE' };
    }

    // 10. Governance Guards Check
    const gg = auth.governanceGuards!;
    if (!gg.killSwitchRequired) return { isValid: false, violationCode: 'KILL_SWITCH_REQUIRED', reason: 'killSwitchRequired must be true' };
    if (!gg.rollbackRequired) return { isValid: false, violationCode: 'ROLLBACK_REQUIRED', reason: 'rollbackRequired must be true' };
    if (!gg.humanDecisionAfterCanaryRequired) return { isValid: false, violationCode: 'HUMAN_DECISION_REQUIRED', reason: 'humanDecisionAfterCanaryRequired must be true' };

    return { isValid: true };
  }
}
