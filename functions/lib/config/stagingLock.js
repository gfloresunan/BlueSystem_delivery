"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 STAGING GOVERNANCE (FASE 2C.12)
 * Staging Safety Locks & Production Environment Guard
 *
 * ════════════════════════════════════════════════════════════════════════
 * MANDATE #1 (2C.12): Emulator Gate corre contra Firebase Emulator real.
 * MANDATE #2 (2C.12): Toda modificación de archivo existente → STOP + NO-GO.
 * MANDATE #3 (2C.12): Production Locks probados con intentos explícitos de bypass.
 * MANDATE #4 (2C.12): Cero cambios de producción incluso si una prueba falla.
 * ════════════════════════════════════════════════════════════════════════
 *
 * AUTH_CLAIMS_LOCK              = TRUE  (heredado de 2C.9)
 * PRODUCTION_PROVISIONING_LOCK  = TRUE  (heredado de 2C.9)
 * PRODUCTION_FIRESTORE_LOCK     = TRUE  (heredado de 2C.9)
 * PRODUCTION_RULES_LOCK         = TRUE  (heredado de 2C.6)
 * LEGACY_DATA_MIGRATION_LOCK    = TRUE  (heredado de 2C.9)
 * ROOM_MIGRATION_LOCK           = TRUE  (heredado de 2C.10)
 * OPERATIONAL_MODULE_LOCK       = TRUE  (heredado de 2C.9)
 *
 * Nuevos locks 2C.12:
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionEnvironmentGuard = exports.PRODUCTION_DATA_READ_LOCK = exports.PRODUCTION_TRAFFIC_LOCK = exports.REAL_CLAIMS_LOCK = exports.SHADOW_RUN_ONLY = exports.STAGING_ONLY_LOCK = exports.PRODUCTION_RULES_LOCK = exports.OPERATIONAL_MODULE_LOCK = exports.ROOM_MIGRATION_LOCK = exports.LEGACY_DATA_MIGRATION_LOCK = exports.FIRESTORE_PRODUCTION_LOCK = exports.AUTH_CLAIMS_LOCK = exports.PRODUCTION_PROVISIONING_LOCK = void 0;
// ─── LOCKS HEREDADOS (Re-exportados para visibilidad completa en 2C.12) ────────
var provisioningSafetyLock_1 = require("./provisioningSafetyLock");
Object.defineProperty(exports, "PRODUCTION_PROVISIONING_LOCK", { enumerable: true, get: function () { return provisioningSafetyLock_1.PRODUCTION_PROVISIONING_LOCK; } });
Object.defineProperty(exports, "AUTH_CLAIMS_LOCK", { enumerable: true, get: function () { return provisioningSafetyLock_1.AUTH_CLAIMS_LOCK; } });
Object.defineProperty(exports, "FIRESTORE_PRODUCTION_LOCK", { enumerable: true, get: function () { return provisioningSafetyLock_1.FIRESTORE_PRODUCTION_LOCK; } });
Object.defineProperty(exports, "LEGACY_DATA_MIGRATION_LOCK", { enumerable: true, get: function () { return provisioningSafetyLock_1.LEGACY_DATA_MIGRATION_LOCK; } });
Object.defineProperty(exports, "ROOM_MIGRATION_LOCK", { enumerable: true, get: function () { return provisioningSafetyLock_1.ROOM_MIGRATION_LOCK; } });
Object.defineProperty(exports, "OPERATIONAL_MODULE_LOCK", { enumerable: true, get: function () { return provisioningSafetyLock_1.OPERATIONAL_MODULE_LOCK; } });
var securityRulesLock_1 = require("./securityRulesLock");
Object.defineProperty(exports, "PRODUCTION_RULES_LOCK", { enumerable: true, get: function () { return securityRulesLock_1.PRODUCTION_RULES_LOCK; } });
// ─── NUEVOS LOCKS 2C.12 ────────────────────────────────────────────────────────
/** Solo ejecuciones de staging están permitidas. Ningún flujo puede enrutar a producción. */
exports.STAGING_ONLY_LOCK = true;
/** El Shadow Run EIAM v3 solo puede producir: SimulationOutput / ValidationResult. No Claims reales. */
exports.SHADOW_RUN_ONLY = true;
/** Bloquea explícitamente setCustomUserClaims() incluso en staging. Solo Shadow Claims. */
exports.REAL_CLAIMS_LOCK = true;
/** Ningún tráfico de producción (merchant-web prod, Android prod, Courier prod) puede conectarse al EIAM shadow. */
exports.PRODUCTION_TRAFFIC_LOCK = true;
/** Ninguna operación staging puede leer datos reales de producción (Firestore bluesystem-7c9af). */
exports.PRODUCTION_DATA_READ_LOCK = true;
/**
 * ProductionEnvironmentGuard
 *
 * Valida que currentEnvironment === 'EMULATOR_LOCAL' antes de permitir
 * cualquier operación de provisioning shadow.
 *
 * MANDATE #3: Se prueban intentos explícitos de bypass.
 * Cualquier intento de operar contra PRODUCTION genera PRODUCTION_ACCESS_BLOCKED.
 */
class ProductionEnvironmentGuard {
    static validate(currentEnvironment, operation) {
        if (currentEnvironment === 'PRODUCTION') {
            const auditEvent = `PRODUCTION_ACCESS_BLOCKED | op=${operation} | env=${currentEnvironment} | ts=${Date.now()}`;
            this.bypassAttemptLog.push(auditEvent);
            return {
                allowed: false,
                environment: currentEnvironment,
                reason: `PRODUCTION_ACCESS_BLOCKED: La operación '${operation}' intentó ejecutarse contra PRODUCCIÓN. Bloqueado por ProductionEnvironmentGuard.`,
                bypassAttemptDetected: true,
                auditEvent
            };
        }
        if (currentEnvironment !== this.ALLOWED_ENVIRONMENT) {
            const auditEvent = `UNAUTHORIZED_ENVIRONMENT_BLOCKED | op=${operation} | env=${currentEnvironment} | ts=${Date.now()}`;
            this.bypassAttemptLog.push(auditEvent);
            return {
                allowed: false,
                environment: currentEnvironment,
                reason: `UNAUTHORIZED_ENVIRONMENT: Solo '${this.ALLOWED_ENVIRONMENT}' está autorizado para operaciones shadow de 2C.12. Entorno detectado: '${currentEnvironment}'.`,
                bypassAttemptDetected: true,
                auditEvent
            };
        }
        return {
            allowed: true,
            environment: currentEnvironment,
            reason: `Entorno '${currentEnvironment}' validado. Operación '${operation}' permitida en staging.`,
            bypassAttemptDetected: false
        };
    }
    /**
     * Verifica que el proyecto Firebase no sea el proyecto de producción.
     * MANDATE #3: Cualquier intento de apuntar a bluesystem-7c9af es bloqueado.
     */
    static validateProjectId(projectId, operation) {
        const PRODUCTION_PROJECT_ID = 'bluesystem-7c9af';
        if (projectId === PRODUCTION_PROJECT_ID) {
            const auditEvent = `PRODUCTION_PROJECT_BLOCKED | projectId=${projectId} | op=${operation} | ts=${Date.now()}`;
            this.bypassAttemptLog.push(auditEvent);
            return {
                allowed: false,
                environment: 'PRODUCTION',
                reason: `PRODUCTION_PROJECT_BLOCKED: Operación '${operation}' intentó usar el proyecto de PRODUCCIÓN '${PRODUCTION_PROJECT_ID}'. Bloqueado.`,
                bypassAttemptDetected: true,
                auditEvent
            };
        }
        return {
            allowed: true,
            environment: 'EMULATOR_LOCAL',
            reason: `Project ID '${projectId}' validado. No es el proyecto de producción.`,
            bypassAttemptDetected: false
        };
    }
    static getBypassAttemptLog() {
        return [...this.bypassAttemptLog];
    }
    static getBypassAttemptCount() {
        return this.bypassAttemptLog.length;
    }
    static resetLog() {
        this.bypassAttemptLog = [];
    }
}
exports.ProductionEnvironmentGuard = ProductionEnvironmentGuard;
ProductionEnvironmentGuard.ALLOWED_ENVIRONMENT = 'EMULATOR_LOCAL';
ProductionEnvironmentGuard.bypassAttemptLog = [];
//# sourceMappingURL=stagingLock.js.map