/**
 * PHASE 2D.10: Post-Canary Production Decision & Limited Expansion Authorization
 * Canonical Type Definitions & Data Contracts
 *
 * Architecture: ONE CORE / ONE CODEBASE / ZERO FORKS / MULTI-TENANT / MULTI-BRAND / WHITE-LABEL
 * Master Invariant: CERTIFICATION ≠ AUTHORIZATION ≠ EXECUTION ≠ EXPANSION ≠ ROLLOUT
 */

export type EvidenceClassificationType =
  | 'PRODUCTION-EXECUTED'
  | 'PRODUCTION-OBSERVED'
  | 'IN-MEMORY / SIMULATED'
  | 'CERTIFIED-BUT-NOT-PRODUCTION-EXECUTED'
  | 'NOT-CERTIFIED';

export interface EvidenceReconciliationEntry {
  component: string;
  action: string;
  expected: string;
  observed: string;
  evidence: string;
  environment: 'LOCAL' | 'EMULATOR' | 'PRODUCTION_SIMULATION' | 'PRODUCTION_REAL';
  executionType: 'IN-MEMORY' | 'SANDBOX' | 'LIVE';
  mutation: 'NONE' | 'ISOLATED_CANDIDATE' | 'PERSISTENT' | 'UNAUTHORIZED';
  requiredAuthorization: string;
  existingAuthorization: string;
  result: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_PROVEN';
  classification: EvidenceClassificationType;
}

export interface EvidenceReconciliationMatrix {
  generatedAt: number;
  totalEntries: number;
  entries: EvidenceReconciliationEntry[];
  summary: {
    productionExecuted: number;
    productionObserved: number;
    inMemorySimulated: number;
    certifiedNotExecuted: number;
    notCertified: number;
    unauthorizedMutations: number;
  };
}

export interface PostCanaryRiskItem {
  riskId: string;
  riskName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detection: string;
  mitigation: string;
  owner: string;
  status: 'CONTROLLED' | 'MITIGATED' | 'ACCEPTED' | 'OPEN';
}

export interface PostCanaryRiskRegister {
  generatedAt: number;
  risks: PostCanaryRiskItem[];
  criticalRisksOpen: number;
}

export interface CapabilityMaturityEntry {
  capability: string;
  c2dCertification: 'CERTIFIED' | 'PARTIAL' | 'NOT_CERTIFIED';
  simulationStatus: 'COMPLETE' | 'PARTIAL' | 'NONE';
  productionEvidence: string;
  authorizationState: 'AUTHORIZED' | 'LOCKED' | 'PENDING_HUMAN_DECISION';
  executionStatus: 'NOT_EXECUTED' | 'CANARY_COMPLETED' | 'IN_PROGRESS' | 'EXPANDED';
  nextRequiredGate: string;
}

export interface CapabilityMaturityMatrix {
  generatedAt: number;
  entries: CapabilityMaturityEntry[];
}

export interface ProposedExpansionAuthorizationPackage {
  authorizationId: string;
  authorizedBy: string;
  authorizationTimestamp: number;
  tenantScope: string[];
  brandScope: string[];
  businessScope: string[];
  branchScope: string[];
  maxAdditionalTenants: number;
  maxAdditionalUsers: number;
  canaryPercentage: number;
  requestLimit: number;
  rollbackDeadline: number;
  abortCriteriaVersion: string;
  successCriteriaVersion: string;
  claimsAuthorized: boolean;
  deploymentAuthorized: boolean;
  migrationAuthorized: boolean;
  rolloutAuthorized: boolean;
  rulesChangeAuthorized: boolean;
  provisioningAuthorized: boolean;
}

export interface PostCanaryScorecard {
  postCanaryAudit: 'PASS' | 'FAIL';
  evidenceReconciliation: 'PASS' | 'FAIL';
  productionClassification: 'PASS' | 'FAIL';
  inMemoryClassification: 'PASS' | 'FAIL';
  scopeValidation: 'PASS' | 'FAIL';
  mutationAudit: 'PASS' | 'FAIL';
  claimsAudit: 'PASS' | 'FAIL';
  rulesAudit: 'PASS' | 'FAIL';
  gatekeeperAudit: 'PASS' | 'FAIL';
  tenantIsolation: 'PASS' | 'FAIL';
  brandIsolation: 'PASS' | 'FAIL';
  webValidation: 'PASS' | 'FAIL';
  androidValidation: 'PASS' | 'FAIL';
  observability: 'PASS' | 'FAIL';
  killSwitch: 'PASS' | 'FAIL';
  rollbackReadiness: 'PASS' | 'FAIL';
  configurationDrift: 'PASS' | 'FAIL';
  securityMatrix: 'PASS' | 'FAIL';
  historicalRegression: 'PASS' | 'FAIL';
  authorizationIndependence: 'PASS' | 'FAIL';
  noAutomaticExpansion: 'PASS' | 'FAIL';

  counters: {
    productionMutations: number;
    unauthorizedMutations: number;
    claimsMutations: number;
    rulesDeployments: number;
    migrations: number;
    additionalCanaryTraffic: number;
    additionalTenants: number;
    additionalUsers: number;
    rollout: number;
  };
}

export type PostCanaryDecision =
  | 'READY_FOR_HUMAN_AUTHORIZATION'
  | 'NOT_READY'
  | 'NO-GO'
  | 'INCONCLUSIVE'
  | 'FROZEN_PENDING_REVIEW'
  | 'ABORTED_BY_GOVERNANCE';
