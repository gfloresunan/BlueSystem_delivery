/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OBSERVABILITY ENGINE (FASE 2C.12)
 * Métricas y Audit Trail del Shadow Run
 *
 * PROHIBIDO registrar:
 * - passwords / tokens / refresh tokens / secretos
 * - claims completos si contienen información sensible
 * - documentos privados / credenciales
 */

export interface StagingObservabilityCounters {
  // Provisioning
  shadowProvisioningCount: number;
  shadowProvisioningSuccess: number;
  shadowProvisioningFailure: number;

  // Dual-Read
  dualReadSuccess: number;
  dualReadConflict: number;
  migrationPending: number;
  securityMismatch: number;

  // Context & Claims
  contextDerivationFailure: number;
  claimsSimulationFailure: number;
  claimsOversized: number;

  // Legacy Fallback
  legacyFallbackCount: number;

  // Security
  crossTenantDenied: number;
  bypassAttemptsBlocked: number;

  // Reliability
  rollbackCount: number;
  idempotentExistingCount: number;

  // Zero-Mutation Counters (MUST stay at 0)
  firestoreProductionWrites: number;
  firestoreProductionUpdates: number;
  firestoreProductionDeletes: number;
  authMutations: number;
  claimsMutations: number;
  refreshTokenRevocations: number;
  productionProvisioningCount: number;
  productionDeploymentCount: number;
  rulesDeploymentCount: number;
  roomDestructiveMigrationCount: number;
  legacyMutationCount: number;
}

export function createObservabilityCounters(): StagingObservabilityCounters {
  return {
    shadowProvisioningCount: 0,
    shadowProvisioningSuccess: 0,
    shadowProvisioningFailure: 0,
    dualReadSuccess: 0,
    dualReadConflict: 0,
    migrationPending: 0,
    securityMismatch: 0,
    contextDerivationFailure: 0,
    claimsSimulationFailure: 0,
    claimsOversized: 0,
    legacyFallbackCount: 0,
    crossTenantDenied: 0,
    bypassAttemptsBlocked: 0,
    rollbackCount: 0,
    idempotentExistingCount: 0,
    // Zero-Mutation (must stay at 0)
    firestoreProductionWrites: 0,
    firestoreProductionUpdates: 0,
    firestoreProductionDeletes: 0,
    authMutations: 0,
    claimsMutations: 0,
    refreshTokenRevocations: 0,
    productionProvisioningCount: 0,
    productionDeploymentCount: 0,
    rulesDeploymentCount: 0,
    roomDestructiveMigrationCount: 0,
    legacyMutationCount: 0
  };
}

export interface ObservabilityReport {
  counters: StagingObservabilityCounters;
  zeroMutationAudit: ZeroMutationAudit;
  legacyFallbackRate: LegacyFallbackRateReport;
}

export interface ZeroMutationAudit {
  allZero: boolean;
  violations: string[];
}

export interface LegacyFallbackRateReport {
  eiamShadowSuccess: number;
  eiamShadowFailure: number;
  legacyFallback: number;
  expectedFallback: boolean;
  unexpectedEiamFailure: boolean;
}

export function auditZeroMutation(counters: StagingObservabilityCounters): ZeroMutationAudit {
  const violations: string[] = [];

  if (counters.firestoreProductionWrites > 0) violations.push(`firestoreProductionWrites=${counters.firestoreProductionWrites}`);
  if (counters.firestoreProductionUpdates > 0) violations.push(`firestoreProductionUpdates=${counters.firestoreProductionUpdates}`);
  if (counters.firestoreProductionDeletes > 0) violations.push(`firestoreProductionDeletes=${counters.firestoreProductionDeletes}`);
  if (counters.authMutations > 0) violations.push(`authMutations=${counters.authMutations}`);
  if (counters.claimsMutations > 0) violations.push(`claimsMutations=${counters.claimsMutations}`);
  if (counters.refreshTokenRevocations > 0) violations.push(`refreshTokenRevocations=${counters.refreshTokenRevocations}`);
  if (counters.productionProvisioningCount > 0) violations.push(`productionProvisioningCount=${counters.productionProvisioningCount}`);
  if (counters.productionDeploymentCount > 0) violations.push(`productionDeploymentCount=${counters.productionDeploymentCount}`);
  if (counters.rulesDeploymentCount > 0) violations.push(`rulesDeploymentCount=${counters.rulesDeploymentCount}`);
  if (counters.roomDestructiveMigrationCount > 0) violations.push(`roomDestructiveMigrationCount=${counters.roomDestructiveMigrationCount}`);
  if (counters.legacyMutationCount > 0) violations.push(`legacyMutationCount=${counters.legacyMutationCount}`);

  return { allZero: violations.length === 0, violations };
}

/**
 * Microfase 2C.12-V: Clasifica Legacy Fallback como EXPECTED vs UNEXPECTED EIAM FAILURE.
 */
export function assessLegacyFallbackRate(counters: StagingObservabilityCounters): LegacyFallbackRateReport {
  const total = counters.shadowProvisioningCount;
  const eiamSuccess = counters.shadowProvisioningSuccess;
  const eiamFailure = counters.shadowProvisioningFailure;
  const legacyFallback = counters.legacyFallbackCount;

  // Un fallback legacy es EXPECTED si EIAM no tiene datos para el usuario (migration_pending).
  // Es UNEXPECTED si EIAM tenía datos pero falló al resolverlos.
  const unexpectedEiamFailure = eiamFailure > 0 && legacyFallback === 0;

  return {
    eiamShadowSuccess: eiamSuccess,
    eiamShadowFailure: eiamFailure,
    legacyFallback,
    expectedFallback: legacyFallback > 0 && eiamFailure === 0,
    unexpectedEiamFailure
  };
}

export function generateObservabilityReport(counters: StagingObservabilityCounters): ObservabilityReport {
  return {
    counters,
    zeroMutationAudit: auditZeroMutation(counters),
    legacyFallbackRate: assessLegacyFallbackRate(counters)
  };
}
