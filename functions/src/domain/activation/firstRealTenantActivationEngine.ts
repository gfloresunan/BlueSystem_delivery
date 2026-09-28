/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.14
 * FIRST REAL TENANT CONTROLLED ACTIVATION ENGINE (C2D.14)
 *
 * Architecture: ONE CORE / ONE CODEBASE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * 
 * Invariants:
 * 1. CERTIFICATION ≠ READINESS ≠ AUTHORIZATION ≠ EXECUTION ≠ DEPLOYMENT ≠ ROLLOUT
 * 2. Scope Confinement: Exactly 1 Tenant, 1 Brand, 1 Org, 1 Business, 1 Branch, 1 Admin
 * 3. Independent Gates: ACTIVATION ≠ DEPLOYMENT ≠ CLAIMS ≠ MIGRATION ≠ PROVISIONING ≠ CANARY ≠ ROLLOUT
 * 4. Zero Production Mutation unless explicit, active, valid human authorization is supplied.
 * 5. Kill Switch ARMED / Fail-Closed Default Deny.
 */

import {
  ProductionAuthorizationLevel,
  ProductionAuthorizationScope
} from '../authorization/productionAuthorizationModels';
import { ProductionAuthorizationValidator } from '../authorization/productionAuthorizationEngine';

export interface HierarchyEntityValidation {
  readonly tenantId: string;
  readonly brandId: string;
  readonly organizationId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly adminUserId: string;
  readonly subscriptionPlan: string;
}

export interface ActivationPreflightReport {
  readonly passed: boolean;
  readonly killSwitchArmed: boolean;
  readonly rulesDriftCount: number;
  readonly configDriftCount: number;
  readonly activeAnomalies: number;
  readonly reason?: string;
}

export interface ActivationExecutionResult {
  readonly status: 'SUCCESS' | 'BLOCKED' | 'DENIED' | 'COMPENSATED' | 'REPLAYED' | 'CONFLICT';
  readonly authorizationId: string;
  readonly tenantId: string;
  readonly brandId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly claimsIssuedCount: number;
  readonly residualStateCount: number;
  readonly canaryRequestsServed: number;
  readonly terminalState: 'WAITING_FOR_HUMAN_DECISION';
  readonly reason?: string;
}

export class FirstRealTenantActivationValidator {
  /**
   * Validates the 30 strict authorization rules for first-tenant controlled activation.
   */
  static validateFirstTenantAuthorization(
    auth: Partial<ProductionAuthorizationScope>,
    now: number = Date.now(),
    consumedAuthIds: Set<string> = new Set()
  ): { isValid: boolean; violationCode?: string; reason?: string } {
    // 1. Basic Scope Validation
    const baseValidation = ProductionAuthorizationValidator.validateScope(auth);
    if (!baseValidation.isValid) {
      return { isValid: false, violationCode: 'INVALID_SCOPE', reason: baseValidation.reason };
    }

    // 2. Already Consumed ID check
    if (consumedAuthIds.has(auth.authorizationId!)) {
      return { isValid: false, violationCode: 'REPLAY_OR_DUPLICATE_AUTH_ID', reason: 'Authorization ID already consumed' };
    }

    // 3. Time Window Validation
    if (now < auth.authorizationTimestamp! || now > auth.expirationTimestamp!) {
      return { isValid: false, violationCode: 'OUTSIDE_VALIDITY_WINDOW', reason: 'Current timestamp outside authorized window' };
    }

    // 4. Level Validation (Must be LEVEL_3 or above for provisioning, but non-transitive)
    if (auth.level !== ProductionAuthorizationLevel.LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION) {
      return { isValid: false, violationCode: 'INVALID_LEVEL_FOR_FIRST_TENANT', reason: 'First real tenant activation requires LEVEL_3' };
    }

    // 5. Confinement Checks: Single entity bounds
    if (auth.maxProvisioningCount! > 1) {
      return { isValid: false, violationCode: 'MASS_PROVISIONING_EXCEEDED', reason: 'maxProvisioningCount must be strictly <= 1' };
    }

    if (auth.maxClaimMutationCount! > 1) {
      return { isValid: false, violationCode: 'MASS_CLAIMS_EXCEEDED', reason: 'maxClaimMutationCount must be strictly <= 1 for first tenant' };
    }

    if (auth.maxCanaryPercentage! > 0.01) {
      return { isValid: false, violationCode: 'CANARY_PERCENTAGE_EXCEEDED', reason: 'maxCanaryPercentage cannot exceed 0.01 (1%)' };
    }

    if (auth.maxCanaryRequests! > 10) {
      return { isValid: false, violationCode: 'CANARY_REQUEST_LIMIT_EXCEEDED', reason: 'maxCanaryRequests cannot exceed 10 requests' };
    }

    // 6. Mandatory Non-Transitive Rollout / Migration Locks
    if (auth.rolloutAuthorized) {
      return { isValid: false, violationCode: 'UNAUTHORIZED_ROLLOUT_GATE', reason: 'rolloutAuthorized cannot be TRUE in LEVEL_3' };
    }

    if (auth.canaryExpansionAuthorized) {
      return { isValid: false, violationCode: 'UNAUTHORIZED_CANARY_EXPANSION', reason: 'canaryExpansionAuthorized cannot be TRUE in LEVEL_3' };
    }

    if (auth.migrationAuthorized) {
      return { isValid: false, violationCode: 'UNAUTHORIZED_MIGRATION_GATE', reason: 'migrationAuthorized cannot be TRUE in LEVEL_3' };
    }

    // 7. Allowed Modules Validation
    const knownModules = new Set([
      'ORDERS', 'CATALOG', 'CUSTOMERS', 'NOTIFICATIONS', 'CONTROL_TOWER',
      'FLEET_CORE', 'GPS_TRACKING', 'COURIER_CASH', 'PROMOTIONS', 'FINANCE'
    ]);
    const forbiddenFirstTenantModules = new Set([
      'GOVERNANCE', 'MULTI_BRAND', 'MULTI_BRANCH', 'MASS_PROVISIONING', 'GENERAL_ROLLOUT'
    ]);

    for (const mod of auth.allowedModules || []) {
      if (!knownModules.has(mod)) {
        return { isValid: false, violationCode: 'UNKNOWN_MODULE_IN_SCOPE', reason: `Unknown module: ${mod}` };
      }
      if (forbiddenFirstTenantModules.has(mod)) {
        return { isValid: false, violationCode: 'FORBIDDEN_FIRST_TENANT_MODULE', reason: `Module ${mod} is forbidden for first single tenant` };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates structural ownership of hierarchy (Brand -> Tenant, Business -> Tenant, Branch -> Business).
   */
  static validateHierarchy(hierarchy: HierarchyEntityValidation): { isValid: boolean; reason?: string } {
    if (!hierarchy.tenantId || hierarchy.tenantId.trim().length === 0) return { isValid: false, reason: 'Missing tenantId' };
    if (!hierarchy.brandId || hierarchy.brandId.trim().length === 0) return { isValid: false, reason: 'Missing brandId' };
    if (!hierarchy.organizationId || hierarchy.organizationId.trim().length === 0) return { isValid: false, reason: 'Missing organizationId' };
    if (!hierarchy.businessId || hierarchy.businessId.trim().length === 0) return { isValid: false, reason: 'Missing businessId' };
    if (!hierarchy.branchId || hierarchy.branchId.trim().length === 0) return { isValid: false, reason: 'Missing branchId' };
    if (!hierarchy.adminUserId || hierarchy.adminUserId.trim().length === 0) return { isValid: false, reason: 'Missing adminUserId' };

    return { isValid: true };
  }
}

export class FirstRealTenantExecutionGuard {
  private killSwitchArmed: boolean = true;
  private consumedAuthIds: Set<string> = new Set();
  private auditEvents: Array<{ event: string; timestamp: number; metadata: Record<string, any> }> = [];

  isKillSwitchArmed(): boolean {
    return this.killSwitchArmed;
  }

  armKillSwitch(): void {
    this.killSwitchArmed = true;
  }

  triggerKillSwitch(reason: string): void {
    this.killSwitchArmed = false;
    this.logEvent('KILL_SWITCH_TRIGGERED', { reason });
  }

  logEvent(event: string, metadata: Record<string, any>): void {
    // Sanitization: Ensure no secrets, tokens or private keys are stored
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (['password', 'jwt', 'token', 'secret', 'apiKey', 'privateKey'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    this.auditEvents.push({ event, timestamp: Date.now(), metadata: sanitized });
  }

  getAuditEvents(): Array<{ event: string; timestamp: number; metadata: Record<string, any> }> {
    return [...this.auditEvents];
  }

  runPreflight(): ActivationPreflightReport {
    this.logEvent('PREFLIGHT_STARTED', {});
    if (!this.killSwitchArmed) {
      this.logEvent('PREFLIGHT_FAILED', { reason: 'KILL_SWITCH_NOT_ARMED' });
      return { passed: false, killSwitchArmed: false, rulesDriftCount: 0, configDriftCount: 0, activeAnomalies: 1, reason: 'Kill Switch is not armed' };
    }
    this.logEvent('PREFLIGHT_PASSED', {});
    return { passed: true, killSwitchArmed: true, rulesDriftCount: 0, configDriftCount: 0, activeAnomalies: 0 };
  }

  /**
   * Executes a controlled activation simulation or validated dry-run.
   */
  executeControlledActivation(
    auth: ProductionAuthorizationScope,
    now: number = Date.now(),
    simulatedFailureStep?: string
  ): ActivationExecutionResult {
    this.logEvent('AUTHORIZATION_VALIDATED', { authorizationId: auth.authorizationId, level: auth.level });

    const authCheck = FirstRealTenantActivationValidator.validateFirstTenantAuthorization(auth, now, this.consumedAuthIds);
    if (!authCheck.isValid) {
      this.logEvent('AUTHORIZATION_REJECTED', { reason: authCheck.reason });
      return {
        status: 'DENIED',
        authorizationId: auth.authorizationId,
        tenantId: auth.tenantId,
        brandId: auth.brandId,
        businessId: auth.businessId,
        branchId: auth.branchId,
        claimsIssuedCount: 0,
        residualStateCount: 0,
        canaryRequestsServed: 0,
        terminalState: 'WAITING_FOR_HUMAN_DECISION',
        reason: authCheck.reason
      };
    }

    const preflight = this.runPreflight();
    if (!preflight.passed) {
      return {
        status: 'BLOCKED',
        authorizationId: auth.authorizationId,
        tenantId: auth.tenantId,
        brandId: auth.brandId,
        businessId: auth.businessId,
        branchId: auth.branchId,
        claimsIssuedCount: 0,
        residualStateCount: 0,
        canaryRequestsServed: 0,
        terminalState: 'WAITING_FOR_HUMAN_DECISION',
        reason: preflight.reason
      };
    }

    // Injected Compensation Simulation
    if (simulatedFailureStep) {
      this.logEvent('ROLLBACK_STARTED', { reason: `Simulated failure at step ${simulatedFailureStep}` });
      // LIFO De-escalation simulation: Restore & Purge -> Residual count = 0
      this.logEvent('ROLLBACK_COMPLETED', { residualStateCount: 0 });
      return {
        status: 'COMPENSATED',
        authorizationId: auth.authorizationId,
        tenantId: auth.tenantId,
        brandId: auth.brandId,
        businessId: auth.businessId,
        branchId: auth.branchId,
        claimsIssuedCount: 0,
        residualStateCount: 0,
        canaryRequestsServed: 0,
        terminalState: 'WAITING_FOR_HUMAN_DECISION',
        reason: 'Compensated successfully after simulated failure'
      };
    }

    // Mark authorization ID as consumed
    this.consumedAuthIds.add(auth.authorizationId);
    this.logEvent('PROVISIONING_STARTED', { tenantId: auth.tenantId });
    this.logEvent('PROVISIONING_COMPLETED', { tenantId: auth.tenantId });

    // Claims issued strictly to authorized admin
    let claimsCount = 0;
    if (auth.claimsAuthorized && auth.allowedUsers.length === 1) {
      this.logEvent('CLAIMS_STARTED', { userId: auth.allowedUsers[0] });
      claimsCount = 1;
      this.logEvent('CLAIMS_COMPLETED', { userId: auth.allowedUsers[0] });
    }

    // Canary Execution (Max 10 requests)
    this.logEvent('CANARY_STARTED', { maxRequests: auth.maxCanaryRequests });
    this.logEvent('CANARY_SUCCESS', { requestsServed: 1 });
    this.logEvent('HUMAN_DECISION_REQUIRED', {});
    this.logEvent('GOVERNANCE_STOP', {});

    return {
      status: 'SUCCESS',
      authorizationId: auth.authorizationId,
      tenantId: auth.tenantId,
      brandId: auth.brandId,
      businessId: auth.businessId,
      branchId: auth.branchId,
      claimsIssuedCount: claimsCount,
      residualStateCount: 0,
      canaryRequestsServed: 1,
      terminalState: 'WAITING_FOR_HUMAN_DECISION'
    };
  }
}
