/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 SECURITY GOVERNANCE (FASE 2C.6)
 * Production Rules Lock
 * 
 * Barrera explícita que bloquea cualquier intento de despliegue automático de Rules a producción.
 */

export const PRODUCTION_RULES_LOCK = true;

export function isProductionRuleDeploymentPermitted(): boolean {
  return false;
}
