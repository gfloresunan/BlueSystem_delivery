/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.13
 * PRODUCTION AUTHORIZATION & ROLLOUT READINESS CONTRACTS (C2D.13)
 * 
 * Architecture: ONE CORE / ZERO FORKS / ZERO PRODUCTION MUTATION
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Invariant: CERTIFICATION ≠ READINESS ≠ AUTHORIZATION ≠ EXECUTION ≠ ROLLOUT
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

export type GateStatus =
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'WAITING_FOR_EXECUTION_ORDER';

export interface ProductionAuthorizationScope {
  readonly authorizationId: string;
  readonly authorizedBy: string;
  readonly authorizationTimestamp: number;
  readonly expirationTimestamp: number;

  readonly level: ProductionAuthorizationLevel;

  readonly tenantId: string;
  readonly brandId: string;
  readonly organizationId: string;
  readonly businessId: string;
  readonly branchId: string;

  readonly subscriptionPlan: string;

  readonly allowedModules: string[];
  readonly excludedModules: string[];

  readonly allowedUsers: string[];
  readonly excludedUsers: string[];

  readonly allowedOperations: string[];

  readonly maxProvisioningCount: number;
  readonly maxClaimMutationCount: number;
  readonly maxCanaryRequests: number;
  readonly maxCanaryPercentage: number;

  readonly rollbackDeadline: number;

  readonly abortCriteriaVersion: string;
  readonly successCriteriaVersion: string;

  readonly deploymentAuthorized: boolean;
  readonly activationAuthorized: boolean;
  readonly claimsAuthorized: boolean;
  readonly migrationAuthorized: boolean;
  readonly provisioningAuthorized: boolean;
  readonly canaryExpansionAuthorized: boolean;
  readonly rolloutAuthorized: boolean;
}

export type TouchpointOperation =
  | 'READ'
  | 'WRITE'
  | 'UPDATE'
  | 'DELETE'
  | 'DEPLOY'
  | 'MIGRATE'
  | 'CLAIMS'
  | 'ROLLBACK';

export type TouchpointStatus =
  | 'CURRENTLY_USED'
  | 'AVAILABLE'
  | 'LOCKED'
  | 'AUTHORIZED'
  | 'NOT_AUTHORIZED';

export interface ProductionTouchpointAudit {
  readonly touchpoint: string;
  readonly operation: TouchpointOperation;
  readonly status: TouchpointStatus;
  readonly requiresAuthorization: boolean;
  readonly isLocked: boolean;
  readonly details: string;
}

export interface ReadinessScorecard {
  readonly technicalReadiness: 'CERTIFIED' | 'NOT_CERTIFIED';
  readonly securityReadiness: 'CERTIFIED' | 'NOT_CERTIFIED';
  readonly operationalReadiness: 'CERTIFIED' | 'NOT_CERTIFIED';
  readonly governanceReadiness: 'CERTIFIED' | 'NOT_CERTIFIED';
  readonly productionAuthorization: 'LOCKED' | 'GRANTED';
  readonly finalVerdict: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
}
