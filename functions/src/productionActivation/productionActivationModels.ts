/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.15
 * PRODUCTION ACTIVATION MODELS & CONTRACTS (C2D.15)
 * 
 * Architecture: ONE CORE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Invariant: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION ≠ DEPLOYMENT ≠ CANARY ≠ EXPANSION ≠ ROLLOUT
 */

export enum ProductionAuthorizationLevel {
  LEVEL_0_NO_AUTHORIZATION = 'LEVEL_0_NO_AUTHORIZATION',
  LEVEL_1_READINESS_REVIEW = 'LEVEL_1_READINESS_REVIEW',
  LEVEL_2_DEPLOYMENT_AUTHORIZATION = 'LEVEL_2_DEPLOYMENT_AUTHORIZATION',
  LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION = 'LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION',
  LEVEL_4_FIRST_USER_CLAIMS_AUTHORIZATION = 'LEVEL_4_FIRST_USER_CLAIMS_AUTHORIZATION',
  LEVEL_5_CONTROLLED_CANARY_AUTHORIZATION = 'LEVEL_5_CONTROLLED_CANARY_AUTHORIZATION',
  LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION = 'LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION',
  LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION = 'LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION'
}

export type ExecutionMode =
  | 'MODE_SIMULATED'
  | 'MODE_READ_ONLY'
  | 'MODE_PREFLIGHT'
  | 'MODE_AUTHORIZED_PRODUCTION'
  | 'MODE_CANARY'
  | 'MODE_ABORTED'
  | 'MODE_ROLLBACK'
  | 'MODE_WAITING_FOR_HUMAN_DECISION';

export interface ProductionAuthorizationPayload {
  readonly authorizationId: string;
  readonly authorizationVersion: string;
  readonly authorizationTimestamp: number;
  readonly expirationTimestamp: number;
  readonly authorizedBy: string;
  readonly authorizationReason: string;
  readonly authorizationLevel: ProductionAuthorizationLevel;
  readonly environment: 'LOCAL' | 'TEST' | 'STAGING' | 'PRODUCTION';
  readonly tenantId: string;
  readonly brandId: string;
  readonly organizationId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly administratorUid: string;
  readonly subscriptionPlan: string;
  readonly authorizedModules: string[];
  readonly maxProvisioningCount: number;
  readonly maxClaimMutationCount: number;
  readonly maxCanaryRequests: number;
  readonly maxCanaryPercentage: number;
  readonly deploymentAuthorized: boolean;
  readonly claimsAuthorized: boolean;
  readonly migrationAuthorized: boolean;
  readonly canaryAuthorized: boolean;
  readonly canaryExpansionAuthorized: boolean;
  readonly rolloutAuthorized: boolean;
  readonly massProvisioningAuthorized: boolean;
  readonly massClaimsAuthorized: boolean;
  readonly killSwitchRequired: boolean;
  readonly rollbackRequired: boolean;
  readonly humanDecisionAfterCanaryRequired: boolean;
  readonly scopeHash: string;
  readonly authorizationSignature: string;
}

export interface ProductionPreflightCheckResult {
  readonly checkId: string;
  readonly name: string;
  readonly passed: boolean;
  readonly isCritical: boolean;
  readonly details: string;
}

export interface ProductionPreflightReport {
  readonly passed: boolean;
  readonly timestamp: number;
  readonly checks: ProductionPreflightCheckResult[];
  readonly failedCount: number;
}

export interface ProductionExecutionReport {
  readonly status: 'SUCCESS' | 'DENIED' | 'BLOCKED' | 'COMPENSATED' | 'REPLAYED' | 'CONFLICT' | 'ABORTED';
  readonly activationId: string;
  readonly authorizationId: string;
  readonly tenantId: string;
  readonly brandId: string;
  readonly claimsIssuedCount: number;
  readonly canaryRequestsServed: number;
  readonly residualStateCount: number;
  readonly executionMode: ExecutionMode;
  readonly terminalState: 'WAITING_FOR_HUMAN_DECISION';
  readonly reason?: string;
}
