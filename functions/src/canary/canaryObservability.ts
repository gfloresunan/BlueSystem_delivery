/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY OBSERVABILITY (FASE 2C.13)
 * Métricas de Telemetría, Monitoreo y Auditoría de Producción
 *
 * Microfase: 2C.13-U (Observability) y 2C.13-Z (Zero-Mutation Audit)
 */

export interface CanaryObservabilityCounters {
  canaryRequests: number;
  legacyRequests: number;
  eiamResolved: number;
  eiamFailed: number;
  expectedDifferences: number;
  unexpectedMismatches: number;
  crossTenantDenied: number;
  crossTenantUnexpectedAllow: number;
  claimsSimulationSuccess: number;
  claimsOversized: number;
  provisioningPlansGenerated: number;
  killSwitchActivations: number;
  legacyFallbacks: number;

  // Zero-Mutation Invariant Counters (Estrictamente 0)
  productionFirestoreWrites: number;
  productionFirestoreUpdates: number;
  productionFirestoreDeletes: number;
  authMutations: number;
  claimsMutations: number;
  refreshTokenRevocations: number;
  productionProvisioningOperations: number;
  rulesDeployments: number;
  roomMigrations: number;
  legacyMigrationOperations: number;
  operationalModuleMutations: number;
}

export function createCanaryObservabilityCounters(): CanaryObservabilityCounters {
  return {
    canaryRequests: 0,
    legacyRequests: 0,
    eiamResolved: 0,
    eiamFailed: 0,
    expectedDifferences: 0,
    unexpectedMismatches: 0,
    crossTenantDenied: 0,
    crossTenantUnexpectedAllow: 0,
    claimsSimulationSuccess: 0,
    claimsOversized: 0,
    provisioningPlansGenerated: 0,
    killSwitchActivations: 0,
    legacyFallbacks: 0,

    // Zero-Mutation
    productionFirestoreWrites: 0,
    productionFirestoreUpdates: 0,
    productionFirestoreDeletes: 0,
    authMutations: 0,
    claimsMutations: 0,
    refreshTokenRevocations: 0,
    productionProvisioningOperations: 0,
    rulesDeployments: 0,
    roomMigrations: 0,
    legacyMigrationOperations: 0,
    operationalModuleMutations: 0
  };
}

export interface CanaryZeroMutationAudit {
  allZero: boolean;
  violations: string[];
}

export function auditCanaryZeroMutation(obs: CanaryObservabilityCounters): CanaryZeroMutationAudit {
  const violations: string[] = [];

  if (obs.productionFirestoreWrites > 0) violations.push(`productionFirestoreWrites=${obs.productionFirestoreWrites}`);
  if (obs.productionFirestoreUpdates > 0) violations.push(`productionFirestoreUpdates=${obs.productionFirestoreUpdates}`);
  if (obs.productionFirestoreDeletes > 0) violations.push(`productionFirestoreDeletes=${obs.productionFirestoreDeletes}`);
  if (obs.authMutations > 0) violations.push(`authMutations=${obs.authMutations}`);
  if (obs.claimsMutations > 0) violations.push(`claimsMutations=${obs.claimsMutations}`);
  if (obs.refreshTokenRevocations > 0) violations.push(`refreshTokenRevocations=${obs.refreshTokenRevocations}`);
  if (obs.productionProvisioningOperations > 0) violations.push(`productionProvisioningOperations=${obs.productionProvisioningOperations}`);
  if (obs.rulesDeployments > 0) violations.push(`rulesDeployments=${obs.rulesDeployments}`);
  if (obs.roomMigrations > 0) violations.push(`roomMigrations=${obs.roomMigrations}`);
  if (obs.legacyMigrationOperations > 0) violations.push(`legacyMigrationOperations=${obs.legacyMigrationOperations}`);
  if (obs.operationalModuleMutations > 0) violations.push(`operationalModuleMutations=${obs.operationalModuleMutations}`);

  return {
    allZero: violations.length === 0,
    violations
  };
}
