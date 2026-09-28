"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY OBSERVABILITY (FASE 2C.13)
 * Métricas de Telemetría, Monitoreo y Auditoría de Producción
 *
 * Microfase: 2C.13-U (Observability) y 2C.13-Z (Zero-Mutation Audit)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCanaryObservabilityCounters = createCanaryObservabilityCounters;
exports.auditCanaryZeroMutation = auditCanaryZeroMutation;
function createCanaryObservabilityCounters() {
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
function auditCanaryZeroMutation(obs) {
    const violations = [];
    if (obs.productionFirestoreWrites > 0)
        violations.push(`productionFirestoreWrites=${obs.productionFirestoreWrites}`);
    if (obs.productionFirestoreUpdates > 0)
        violations.push(`productionFirestoreUpdates=${obs.productionFirestoreUpdates}`);
    if (obs.productionFirestoreDeletes > 0)
        violations.push(`productionFirestoreDeletes=${obs.productionFirestoreDeletes}`);
    if (obs.authMutations > 0)
        violations.push(`authMutations=${obs.authMutations}`);
    if (obs.claimsMutations > 0)
        violations.push(`claimsMutations=${obs.claimsMutations}`);
    if (obs.refreshTokenRevocations > 0)
        violations.push(`refreshTokenRevocations=${obs.refreshTokenRevocations}`);
    if (obs.productionProvisioningOperations > 0)
        violations.push(`productionProvisioningOperations=${obs.productionProvisioningOperations}`);
    if (obs.rulesDeployments > 0)
        violations.push(`rulesDeployments=${obs.rulesDeployments}`);
    if (obs.roomMigrations > 0)
        violations.push(`roomMigrations=${obs.roomMigrations}`);
    if (obs.legacyMigrationOperations > 0)
        violations.push(`legacyMigrationOperations=${obs.legacyMigrationOperations}`);
    if (obs.operationalModuleMutations > 0)
        violations.push(`operationalModuleMutations=${obs.operationalModuleMutations}`);
    return {
        allZero: violations.length === 0,
        violations
    };
}
//# sourceMappingURL=canaryObservability.js.map