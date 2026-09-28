/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 PROVISIONING GOVERNANCE (FASE 2C.9)
 * Safety Locks de Aislamiento y Bloqueo de Producción
 */

export const PRODUCTION_PROVISIONING_LOCK = true;
export const AUTH_CLAIMS_LOCK = true;
export const FIRESTORE_PRODUCTION_LOCK = true;
export const PRODUCTION_RULES_LOCK = true;
export const LEGACY_DATA_MIGRATION_LOCK = true;
export const ROOM_MIGRATION_LOCK = true;
export const OPERATIONAL_MODULE_LOCK = true;

export class ProvisioningSafetyGate {
  static isProductionProvisioningPermitted(): boolean {
    return !PRODUCTION_PROVISIONING_LOCK; // FALSE en Fase 2C.9
  }

  static isAuthMutationPermitted(): boolean {
    return !AUTH_CLAIMS_LOCK; // FALSE en Fase 2C.9
  }

  static isFirestoreProductionWritePermitted(): boolean {
    return !FIRESTORE_PRODUCTION_LOCK; // FALSE en Fase 2C.9
  }
}
