"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY ROUTER (FASE 2C.13)
 * Enrutador Inteligente con Aislamiento Total del Carril A
 *
 * Microfases: 2C.13-C (Canary Feature Flag) y 2C.13-D (Canary Router)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryRouter = void 0;
const productionCanaryLock_1 = require("../config/productionCanaryLock");
const canaryKillSwitch_1 = require("./canaryKillSwitch");
const canaryDifferential_1 = require("./canaryDifferential");
const canaryActivationGate_1 = require("./canaryActivationGate");
const canaryWindowGuard_1 = require("./canaryWindowGuard");
class CanaryRouter {
    /**
     * Enruta la resolución de identidad/membresía preservando el Carril A como autoridad única.
     */
    static async routeIdentityResolution(uid, legacyResolver, eiamResolver, obs, customAllowlist, canaryEnabledOverride) {
        // 1. Siempre ejecutar la resolución Legacy (Autoridad Operacional)
        const legacyResult = await legacyResolver();
        if (obs)
            obs.legacyRequests++;
        // 2. Comprobar autorización activa vía Activation Gate o Allowlist
        const activeAuth = canaryActivationGate_1.CanaryActivationGate.getAuthorization();
        let isAuthorizedByGate = false;
        if (activeAuth) {
            const val = canaryActivationGate_1.CanaryActivationGate.validateAuthorization(activeAuth);
            if (val.isValid && (activeAuth.targetScope === uid || activeAuth.targetScope === 'ALL_CANARY_SUBJECTS')) {
                isAuthorizedByGate = true;
            }
        }
        const isSubjectCanary = productionCanaryLock_1.CanarySafetyController.isSubjectInCanary(uid, canaryEnabledOverride !== undefined ? canaryEnabledOverride : isAuthorizedByGate, customAllowlist || (isAuthorizedByGate ? [uid] : undefined));
        const isKillSwitchActive = canaryKillSwitch_1.CanaryKillSwitch.isCanaryActive();
        const isWindowOpen = canaryWindowGuard_1.CanaryWindowGuard.isWindowOpen();
        if (!isSubjectCanary || !isKillSwitchActive || !isWindowOpen || productionCanaryLock_1.EIAM_V3_CANARY_MODE === 'OFF') {
            return {
                authoritativeResult: legacyResult,
                source: 'LEGACY_AUTHORITATIVE',
                canaryObserved: false
            };
        }
        // 3. Ejecución de Observación en Paralelo (Shadow/Observe Only)
        if (obs)
            obs.canaryRequests++;
        try {
            const eiamResult = await eiamResolver();
            if (eiamResult && obs) {
                obs.eiamResolved++;
            }
            else if (obs) {
                obs.eiamFailed++;
            }
            // 4. Comparación diferencial en tiempo real (si legacyResult tiene la estructura esperada)
            const legacyObj = legacyResult;
            let differentialSummary;
            if (legacyObj && legacyObj.uid && legacyObj.businessId) {
                const diffRes = canaryDifferential_1.CanaryDifferentialEngine.evaluateSubject(uid, {
                    uid: legacyObj.uid,
                    businessId: legacyObj.businessId,
                    branchId: legacyObj.branchId,
                    role: legacyObj.role || 'merchant_owner',
                    status: legacyObj.status || 'ACTIVE'
                }, eiamResult, obs);
                differentialSummary = diffRes.hasUnexpectedMismatches
                    ? 'UNEXPECTED_MISMATCH_DETECTED'
                    : 'MATCH_OR_EXPECTED_DIFFERENCES';
            }
            return {
                authoritativeResult: legacyResult,
                source: 'LEGACY_AUTHORITATIVE',
                canaryObserved: true,
                differentialSummary
            };
        }
        catch (err) {
            // 5. Fail-Closed: ante cualquier error en la capa EIAM, el sistema continúa 100% en Legacy
            console.warn(`[CanaryRouter] Error en observación EIAM para UID=${uid}:`, err.message || err);
            if (obs) {
                obs.eiamFailed++;
                obs.legacyFallbacks++;
            }
            return {
                authoritativeResult: legacyResult,
                source: 'LEGACY_AUTHORITATIVE',
                canaryObserved: false,
                differentialSummary: 'EIAM_OBSERVATION_ERROR_FAIL_CLOSED'
            };
        }
    }
}
exports.CanaryRouter = CanaryRouter;
//# sourceMappingURL=canaryRouter.js.map