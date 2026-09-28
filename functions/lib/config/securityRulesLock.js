"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 SECURITY GOVERNANCE (FASE 2C.6)
 * Production Rules Lock
 *
 * Barrera explícita que bloquea cualquier intento de despliegue automático de Rules a producción.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCTION_RULES_LOCK = void 0;
exports.isProductionRuleDeploymentPermitted = isProductionRuleDeploymentPermitted;
exports.PRODUCTION_RULES_LOCK = true;
function isProductionRuleDeploymentPermitted() {
    return false;
}
//# sourceMappingURL=securityRulesLock.js.map