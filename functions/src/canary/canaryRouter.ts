/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY ROUTER (FASE 2C.13)
 * Enrutador Inteligente con Aislamiento Total del Carril A
 *
 * Microfases: 2C.13-C (Canary Feature Flag) y 2C.13-D (Canary Router)
 */

import { CanarySafetyController, EIAM_V3_CANARY_MODE } from '../config/productionCanaryLock';
import { CanaryKillSwitch } from './canaryKillSwitch';
import { CanaryObservabilityCounters } from './canaryObservability';
import { CanaryDifferentialEngine } from './canaryDifferential';
import { CanaryActivationGate } from './canaryActivationGate';
import { CanaryWindowGuard } from './canaryWindowGuard';

export interface CanaryRouteResolution<T> {
  authoritativeResult: T;
  source: 'LEGACY_AUTHORITATIVE' | 'EIAM_V3_AUTHORITATIVE';
  canaryObserved: boolean;
  differentialSummary?: string;
}

export class CanaryRouter {
  /**
   * Enruta la resolución de identidad/membresía preservando el Carril A como autoridad única.
   */
  static async routeIdentityResolution<TLegacy, TEiam extends {
    uid: string;
    businessId: string;
    branchId?: string;
    tenantId: string;
    brandId?: string;
    role: string;
    status: string;
    schemaVersion: string;
  }>(
    uid: string,
    legacyResolver: () => Promise<TLegacy>,
    eiamResolver: () => Promise<TEiam | null>,
    obs?: CanaryObservabilityCounters,
    customAllowlist?: ReadonlyArray<string>,
    canaryEnabledOverride?: boolean
  ): Promise<CanaryRouteResolution<TLegacy>> {
    // 1. Siempre ejecutar la resolución Legacy (Autoridad Operacional)
    const legacyResult = await legacyResolver();
    if (obs) obs.legacyRequests++;

    // 2. Comprobar autorización activa vía Activation Gate o Allowlist
    const activeAuth = CanaryActivationGate.getAuthorization();
    let isAuthorizedByGate = false;

    if (activeAuth) {
      const val = CanaryActivationGate.validateAuthorization(activeAuth);
      if (val.isValid && (activeAuth.targetScope === uid || activeAuth.targetScope === 'ALL_CANARY_SUBJECTS')) {
        isAuthorizedByGate = true;
      }
    }

    const isSubjectCanary = CanarySafetyController.isSubjectInCanary(
      uid,
      canaryEnabledOverride !== undefined ? canaryEnabledOverride : isAuthorizedByGate,
      customAllowlist || (isAuthorizedByGate ? [uid] : undefined)
    );

    const isKillSwitchActive = CanaryKillSwitch.isCanaryActive();
    const isWindowOpen = CanaryWindowGuard.isWindowOpen();

    if (!isSubjectCanary || !isKillSwitchActive || !isWindowOpen || EIAM_V3_CANARY_MODE === 'OFF') {
      return {
        authoritativeResult: legacyResult,
        source: 'LEGACY_AUTHORITATIVE',
        canaryObserved: false
      };
    }

    // 3. Ejecución de Observación en Paralelo (Shadow/Observe Only)
    if (obs) obs.canaryRequests++;

    try {
      const eiamResult = await eiamResolver();

      if (eiamResult && obs) {
        obs.eiamResolved++;
      } else if (obs) {
        obs.eiamFailed++;
      }

      // 4. Comparación diferencial en tiempo real (si legacyResult tiene la estructura esperada)
      const legacyObj = legacyResult as any;
      let differentialSummary: string | undefined;

      if (legacyObj && legacyObj.uid && legacyObj.businessId) {
        const diffRes = CanaryDifferentialEngine.evaluateSubject(
          uid,
          {
            uid: legacyObj.uid,
            businessId: legacyObj.businessId,
            branchId: legacyObj.branchId,
            role: legacyObj.role || 'merchant_owner',
            status: legacyObj.status || 'ACTIVE'
          },
          eiamResult,
          obs
        );

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

    } catch (err: any) {
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
