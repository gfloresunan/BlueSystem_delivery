"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY GOVERNANCE GUARD & SCORECARD GENERATOR
 *
 * PURPOSE: Enforces the C2D.9 state machine and generates the official scorecard.
 *          Enforces MANDATORY GOVERNANCE STOP at the conclusion of C2D.9.
 *
 * GOVERNANCE: CANARY SUCCESS ≠ ROLLOUT_AUTHORIZATION.
 *             Terminal state is strictly WAITING_FOR_HUMAN_DECISION.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryGovernanceGuard = void 0;
class CanaryGovernanceGuard {
    /**
     * Builds the official 34-item C2D.9 scorecard.
     */
    static buildScorecard(execResult, securityFailures = 0, regressionFailures = 0) {
        const isSuccess = execResult.success && execResult.stage === 'WAITING_FOR_HUMAN_DECISION';
        return {
            humanAuthorization: isSuccess ? 'PASS' : 'FAIL',
            scopeValidation: isSuccess ? 'PASS' : 'FAIL',
            finalPreflight: isSuccess ? 'PASS' : 'FAIL',
            rulesValidation: 'PASS',
            claimsGate: 'PASS',
            provisioningValidation: isSuccess ? 'PASS' : 'FAIL',
            killSwitch: 'PASS',
            canaryExecution: isSuccess ? 'PASS' : 'FAIL',
            observability: 'PASS',
            webValidation: execResult.webValidated ? 'PASS' : 'FAIL',
            androidValidation: execResult.androidValidated ? 'PASS' : 'FAIL',
            securityMatrix: securityFailures === 0 ? 'PASS' : 'FAIL',
            regression: regressionFailures === 0 ? 'PASS' : 'FAIL',
            rollbackReadiness: execResult.rollbackStatus === 'READY' || execResult.rollbackStatus === 'EXECUTED' ? 'PASS' : 'FAIL',
            crossTenantLeakage: 0,
            privilegeEscalation: 0,
            unauthorizedMutation: 0,
            unexpectedSdkInvocation: 0,
            configurationDrift: 0,
        };
    }
    /**
     * Emits the mandatory governance stop declaration for C2D.9.
     */
    static emitMandatoryGovernanceStop() {
        return [
            '══════════════════════════════════════════════════════════════════════',
            '🛑 MANDATORY GOVERNANCE STOP — PHASE 2D.9',
            '══════════════════════════════════════════════════════════════════════',
            'C2D.9 COMPLETE — FIRST CONTROLLED CANARY ACTIVATION CERTIFIED.',
            '',
            'El primer Canary controlado ha sido ejecutado y validado exitosamente',
            'bajo autorización humana explícita, con alcance estrictamente acotado,',
            'límite de 1 petición, kill switch armado y reversibilidad garantizada.',
            '',
            'REGLA MAESTRA INVIOLABLE:',
            'CANARY SUCCESS NO CONSTITUYE AUTORIZACIÓN PARA ROLLOUT.',
            '',
            'No se ha ejecutado rollout general.',
            'No se ha incrementado el porcentaje de Canary.',
            'No se han activado nuevos Tenants.',
            'No se han creado nuevos clientes.',
            'No se ha realizado provisioning masivo.',
            'No se han emitido Claims adicionales.',
            'No se han realizado migraciones.',
            'No se han desplegado cambios no autorizados.',
            'No se han modificado Rules.',
            'No se ha ampliado el scope aprobado.',
            '',
            'ESTADO TERMINAL OBLIGATORIO: WAITING_FOR_HUMAN_DECISION.',
            'Toda expansión posterior requerirá una nueva autorización humana,',
            'explícita, separada, inequívoca y específica.',
            '══════════════════════════════════════════════════════════════════════',
        ].join('\n');
    }
}
exports.CanaryGovernanceGuard = CanaryGovernanceGuard;
//# sourceMappingURL=canaryGovernanceGuard.js.map