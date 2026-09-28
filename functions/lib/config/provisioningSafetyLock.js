"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 PROVISIONING GOVERNANCE (FASE 2C.9)
 * Safety Locks de Aislamiento y Bloqueo de Producción
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvisioningSafetyGate = exports.OPERATIONAL_MODULE_LOCK = exports.ROOM_MIGRATION_LOCK = exports.LEGACY_DATA_MIGRATION_LOCK = exports.PRODUCTION_RULES_LOCK = exports.FIRESTORE_PRODUCTION_LOCK = exports.AUTH_CLAIMS_LOCK = exports.PRODUCTION_PROVISIONING_LOCK = void 0;
exports.PRODUCTION_PROVISIONING_LOCK = true;
exports.AUTH_CLAIMS_LOCK = true;
exports.FIRESTORE_PRODUCTION_LOCK = true;
exports.PRODUCTION_RULES_LOCK = true;
exports.LEGACY_DATA_MIGRATION_LOCK = true;
exports.ROOM_MIGRATION_LOCK = true;
exports.OPERATIONAL_MODULE_LOCK = true;
class ProvisioningSafetyGate {
    static isProductionProvisioningPermitted() {
        return !exports.PRODUCTION_PROVISIONING_LOCK; // FALSE en Fase 2C.9
    }
    static isAuthMutationPermitted() {
        return !exports.AUTH_CLAIMS_LOCK; // FALSE en Fase 2C.9
    }
    static isFirestoreProductionWritePermitted() {
        return !exports.FIRESTORE_PRODUCTION_LOCK; // FALSE en Fase 2C.9
    }
}
exports.ProvisioningSafetyGate = ProvisioningSafetyGate;
//# sourceMappingURL=provisioningSafetyLock.js.map