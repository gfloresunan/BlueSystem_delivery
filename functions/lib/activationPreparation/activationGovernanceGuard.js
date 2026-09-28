"use strict";
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION GOVERNANCE GUARD & DECISION ENGINE
 *
 * PURPOSE: Evaluates all preflight, dry-run, and security results to produce
 *          the final Governance Decision (PREPARED / CONDITIONAL_PREPARED / NO_GO).
 *
 * RULE: Enforces the MANDATORY GOVERNANCE STOP. C2D.8 NEVER auto-authorizes C2D.9.
 *       ACTIVATION_AUTHORIZATION = FALSE at the end of C2D.8.
 * ══════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationGovernanceGuard = void 0;
const activationAuthorization_1 = require("./activationAuthorization");
const canaryKillSwitch_1 = require("../canary/canaryKillSwitch");
const productionMutationGuard_1 = require("../productionReadiness/productionMutationGuard");
class ActivationGovernanceGuard {
    /**
     * Computes the formal governance decision for C2D.8.
     */
    static evaluate(input) {
        const now = Date.now();
        const blockers = [];
        const conditions = [];
        // 1. Preflight status
        if (input.preflightReport.overallStatus !== 'PASS') {
            blockers.push(`Preflight checklist failed with ${input.preflightReport.criticalFailures.length} critical issues`);
        }
        // 2. Dry-run status
        if (input.dryRunResult.status !== 'DRY_RUN_SUCCESS') {
            blockers.push(`Dry-run execution failed (status=${input.dryRunResult.status})`);
        }
        // 3. Security attack failures
        if (input.securityAttackFailures > 0) {
            blockers.push(`${input.securityAttackFailures} security attack vector(s) were NOT blocked`);
        }
        // 4. Regression failures
        if (input.regressionFailures > 0) {
            blockers.push(`${input.regressionFailures} regression test failures detected`);
        }
        // 5. Production mutations guard check
        const totalMutations = productionMutationGuard_1.ProductionMutationGuard.getTotalMutations();
        if (totalMutations > 0) {
            blockers.push(`GOVERNANCE_VIOLATION: ${totalMutations} production mutations detected during C2D.8`);
        }
        // 6. Kill switch check
        if (canaryKillSwitch_1.CanaryKillSwitch.isCanaryActive()) {
            blockers.push('Canary is active — kill switch must remain ARMED');
        }
        // 7. Authorization gates check
        const gates = (0, activationAuthorization_1.getAllGatesStatus)();
        if (!gates.allUnauthorized) {
            conditions.push('Some authorization gates are not at initial DRAFT/UNINITIALIZED state');
        }
        let outcome;
        if (blockers.length > 0) {
            outcome = 'NO_GO';
        }
        else if (conditions.length > 0) {
            outcome = 'CONDITIONAL_PREPARED';
        }
        else {
            outcome = 'PREPARED';
        }
        return {
            decisionId: `gov-dec-${now}`,
            outcome,
            phase: 'C2D.8',
            baseline: 'C2D.7',
            activationAuthorizationStatus: 'FALSE',
            deploymentAuthorizationStatus: 'FALSE',
            claimsAuthorizationStatus: 'FALSE',
            migrationAuthorizationStatus: 'FALSE',
            rolloutAuthorizationStatus: 'FALSE',
            killSwitchStatus: 'ARMED',
            canaryEnabled: false,
            productionMutations: 0,
            realUsersExposed: 0,
            conditions: conditions.length > 0 ? conditions : undefined,
            blockers: blockers.length > 0 ? blockers : undefined,
            mandatoryGovernanceStop: true,
            nextPhaseRequires: 'EXPLICIT_HUMAN_AUTHORIZATION',
            timestamp: now,
        };
    }
    /**
     * Emits the mandatory governance stop declaration text.
     */
    static emitMandatoryGovernanceStop() {
        return [
            '══════════════════════════════════════════════════════════════════════',
            '🛑 MANDATORY GOVERNANCE STOP — PHASE 2D.8',
            '══════════════════════════════════════════════════════════════════════',
            'C2D.8 COMPLETE — CONTROLLED ACTIVATION PREPARATION CERTIFIED.',
            '',
            'BlueSystem Core ha demostrado mediante simulación local que existe un',
            'procedimiento formal, verificable, observable y reversible para preparar',
            'una futura primera activación productiva.',
            '',
            'No se ha ejecutado ninguna activación productiva.',
            'No se han creado clientes reales.',
            'No se han creado Tenants productivos.',
            'No se han creado Brands productivos.',
            'No se han creado Businesses productivos.',
            'No se han creado Branches productivos.',
            'No se han creado Subscriptions productivas.',
            'No se han creado Memberships productivas.',
            'No se han emitido Custom Claims.',
            'No se han realizado migraciones.',
            'No se han desplegado Rules.',
            'No se han desplegado Functions.',
            'No se ha desplegado Web.',
            'No se ha construido APK productivo.',
            'No se ha activado Canary.',
            'No se ha generado tráfico Canary.',
            'No se ha ejecutado Rollout.',
            'No se ha realizado provisioning productivo.',
            '',
            'READINESS DOES NOT AUTHORIZE ACTIVATION.',
            'C2D.8 NO constituye autorización para ejecutar producción.',
            'Toda activación futura requiere una autorización humana nueva, explícita,',
            'separada, inequívoca, específica y limitada al alcance aprobado.',
            '══════════════════════════════════════════════════════════════════════',
        ].join('\n');
    }
}
exports.ActivationGovernanceGuard = ActivationGovernanceGuard;
//# sourceMappingURL=activationGovernanceGuard.js.map