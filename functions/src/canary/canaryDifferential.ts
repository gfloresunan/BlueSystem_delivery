/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CANARY DIFFERENTIAL ENGINE (FASE 2C.13)
 * Comparador Diferencial de Producción en Tiempo Real
 *
 * Microfases: 2C.13-E (Dual-Read Production Canary) y 2C.13-V (Differential Production Matrix)
 */

import { CanaryKillSwitch } from './canaryKillSwitch';
import { CanaryObservabilityCounters } from './canaryObservability';

export type CanaryDifferentialOutcome = 'MATCH' | 'EXPECTED_DIFFERENCE' | 'UNEXPECTED_MISMATCH';

export interface CanaryDifferentialField {
  fieldName: string;
  legacyValue: unknown;
  eiamValue: unknown;
  outcome: CanaryDifferentialOutcome;
  detail: string;
}

export interface CanaryDifferentialResult {
  uid: string;
  fields: CanaryDifferentialField[];
  hasUnexpectedMismatches: boolean;
  killSwitchTriggered: boolean;
}

export class CanaryDifferentialEngine {
  private static readonly EXPECTED_STRUCTURAL_FIELDS = [
    'tenantId',
    'brandId',
    'organizationId',
    'schemaVersion',
    'eiamVer',
    'roleNomenclature'
  ];

  /**
   * Ejecuta la comparación diferencial para un sujeto del Canary.
   */
  static evaluateSubject(
    uid: string,
    legacyResult: {
      uid: string;
      businessId: string;
      branchId?: string;
      role: string;
      status: string;
    },
    eiamResult: {
      uid: string;
      businessId: string;
      branchId?: string;
      tenantId: string;
      brandId?: string;
      role: string;
      status: string;
      schemaVersion: string;
    } | null,
    obs?: CanaryObservabilityCounters
  ): CanaryDifferentialResult {
    const fields: CanaryDifferentialField[] = [];
    let hasUnexpected = false;

    if (!eiamResult) {
      // EIAM v3 no resolvió para este usuario (Legacy Fallback)
      fields.push({
        fieldName: 'resolution',
        legacyValue: 'FOUND',
        eiamValue: 'NULL',
        outcome: 'EXPECTED_DIFFERENCE',
        detail: 'EIAM v3 no contiene membresía para el usuario; operando bajo Legacy Fallback.'
      });
      if (obs) {
        obs.legacyFallbacks++;
        obs.expectedDifferences++;
      }
      return { uid, fields, hasUnexpectedMismatches: false, killSwitchTriggered: false };
    }

    // 1. UID
    if (legacyResult.uid === eiamResult.uid) {
      fields.push({ fieldName: 'uid', legacyValue: legacyResult.uid, eiamValue: eiamResult.uid, outcome: 'MATCH', detail: 'UID idéntico.' });
    } else {
      hasUnexpected = true;
      fields.push({ fieldName: 'uid', legacyValue: legacyResult.uid, eiamValue: eiamResult.uid, outcome: 'UNEXPECTED_MISMATCH', detail: 'UID discrepante entre Legacy y EIAM.' });
    }

    // 2. BusinessId
    if (legacyResult.businessId === eiamResult.businessId) {
      fields.push({ fieldName: 'businessId', legacyValue: legacyResult.businessId, eiamValue: eiamResult.businessId, outcome: 'MATCH', detail: 'businessId idéntico.' });
    } else {
      hasUnexpected = true;
      fields.push({ fieldName: 'businessId', legacyValue: legacyResult.businessId, eiamValue: eiamResult.businessId, outcome: 'UNEXPECTED_MISMATCH', detail: 'businessId discrepante.' });
    }

    // 3. Status
    if (legacyResult.status.toUpperCase() === eiamResult.status.toUpperCase()) {
      fields.push({ fieldName: 'status', legacyValue: legacyResult.status, eiamValue: eiamResult.status, outcome: 'MATCH', detail: 'Status coincidente.' });
    } else {
      hasUnexpected = true;
      fields.push({ fieldName: 'status', legacyValue: legacyResult.status, eiamValue: eiamResult.status, outcome: 'UNEXPECTED_MISMATCH', detail: 'Status discrepante.' });
    }

    // 4. Role (Mapeo canónico)
    const isRoleMatch =
      legacyResult.role.toUpperCase() === eiamResult.role.toUpperCase() ||
      (legacyResult.role === 'merchant_owner' && eiamResult.role === 'OWNER') ||
      (legacyResult.role === 'merchant_staff' && eiamResult.role === 'STAFF') ||
      (legacyResult.role === 'merchant_staff' && eiamResult.role === 'MANAGER') ||
      (legacyResult.role === 'merchant_manager' && eiamResult.role === 'MANAGER') ||
      (legacyResult.role === 'merchant_cashier' && eiamResult.role === 'CASHIER') ||
      (legacyResult.role === 'merchant_cook' && eiamResult.role === 'COOK');

    if (isRoleMatch) {
      fields.push({
        fieldName: 'role',
        legacyValue: legacyResult.role,
        eiamValue: eiamResult.role,
        outcome: legacyResult.role === eiamResult.role ? 'MATCH' : 'EXPECTED_DIFFERENCE',
        detail: 'Rol compatible y semánticamente equivalente.'
      });
      if (legacyResult.role !== eiamResult.role && obs) obs.expectedDifferences++;
    } else {
      hasUnexpected = true;
      fields.push({ fieldName: 'role', legacyValue: legacyResult.role, eiamValue: eiamResult.role, outcome: 'UNEXPECTED_MISMATCH', detail: 'Rol incompatible.' });
    }

    // 5. TenantId (Estructuralmente nuevo en V3)
    fields.push({
      fieldName: 'tenantId',
      legacyValue: 'N/A',
      eiamValue: eiamResult.tenantId,
      outcome: 'EXPECTED_DIFFERENCE',
      detail: 'tenantId es exclusivo del modelo EIAM v3 (Diferencia Estructural Esperada).'
    });
    if (obs) obs.expectedDifferences++;

    // Registrar en observabilidad y disparar Kill Switch si hay anomalías
    let killSwitchTriggered = false;
    if (hasUnexpected) {
      if (obs) obs.unexpectedMismatches++;
      CanaryKillSwitch.disableCanary(`UNEXPECTED_MISMATCH detectado en sujeto Canary UID=${uid}`);
      killSwitchTriggered = true;
    }

    return {
      uid,
      fields,
      hasUnexpectedMismatches: hasUnexpected,
      killSwitchTriggered
    };
  }
}
