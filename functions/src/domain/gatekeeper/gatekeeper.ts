/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — SUBSCRIPTION & ENTITLEMENT GATEKEEPER ENGINE (FASE 2D.3)
 * Evaluador Puro de Seguridad: Aplica el Principio de Default Deny y Aislamiento Multi-Tenant
 * 
 * Regla de Oro:
 * ROLE != ENTITLEMENT != SUBSCRIPTION != TENANT != BRAND
 * EFFECTIVE_ACCESS = ROLE_PERMISSIONS ∩ SUBSCRIPTION_ENTITLEMENTS ∩ TENANT_CONTEXT
 */

import { CapabilityModule, SubscriptionEntity, SubscriptionQuotas } from '../platform/models';
import { GatekeeperContext, AccessDecision, QuotaDecision, AccessDecisionReason } from './models';
import { MODULE_CATALOG, ModuleDefinition } from './catalog';

/**
 * Valida la integridad estructural del contexto de seguridad.
 */
function validateContext(context: GatekeeperContext): { isValid: boolean; reason?: AccessDecisionReason } {
  if (!context || typeof context !== 'object') {
    return { isValid: false, reason: 'CONTEXT_INVALID' };
  }
  if (!context.uid || typeof context.uid !== 'string' || context.uid.trim().length === 0) {
    return { isValid: false, reason: 'CONTEXT_INVALID' };
  }
  if (!context.membershipId || typeof context.membershipId !== 'string') {
    return { isValid: false, reason: 'CONTEXT_INVALID' };
  }
  if (!context.tenantId || typeof context.tenantId !== 'string' || context.tenantId.trim().length === 0) {
    return { isValid: false, reason: 'CONTEXT_INVALID' };
  }
  if (!context.role || typeof context.role !== 'string') {
    return { isValid: false, reason: 'CONTEXT_INVALID' };
  }
  return { isValid: true };
}

/**
 * Evalúa el ciclo de vida y la vigencia temporal de la suscripción del tenant.
 */
function evaluateSubscription(
  context: GatekeeperContext,
  now: number = Date.now()
): { isValid: boolean; reason: AccessDecisionReason } {
  const sub = context.subscription;
  if (!sub || typeof sub !== 'object') {
    return { isValid: false, reason: 'SUBSCRIPTION_MISSING' };
  }

  // Aislamiento Tenant: La suscripción DEBE pertenecer exactamente al tenant del contexto
  if (sub.tenantId !== context.tenantId) {
    return { isValid: false, reason: 'TENANT_MISMATCH' };
  }

  // Estados permitidos
  if (sub.status === 'SUSPENDED' || sub.status === 'CANCELLED' || sub.status === 'ARCHIVED') {
    return { isValid: false, reason: 'SUBSCRIPTION_INACTIVE' };
  }
  if (sub.status === 'PAST_DUE') {
    return { isValid: false, reason: 'SUBSCRIPTION_EXPIRED' };
  }
  if (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') {
    return { isValid: false, reason: 'SUBSCRIPTION_INACTIVE' };
  }

  // Validación de inicio temporal (Future Subscription Guard)
  if (sub.startDate && sub.startDate > now) {
    return { isValid: false, reason: 'SUBSCRIPTION_FUTURE' };
  }

  // Validación de expiración temporal (Expiration Guard)
  if (sub.endDate && sub.endDate < now) {
    return { isValid: false, reason: 'SUBSCRIPTION_EXPIRED' };
  }

  return { isValid: true, reason: 'ALLOWED' };
}

/**
 * Obtiene la lista efectiva de entitlements (módulos habilitados) deduciendo overrides y bloqueos.
 */
function getEffectiveEntitlements(context: GatekeeperContext): Set<string> {
  const effective = new Set<string>();
  const sub = context.subscription;

  // 1. Entitlements directos de la suscripción
  if (sub && Array.isArray(sub.enabledFeatures)) {
    for (const feature of sub.enabledFeatures) {
      const fStr = String(feature);
      if (fStr.trim().length > 0 && fStr !== '*' && fStr !== 'ALL') {
        effective.add(fStr.toUpperCase());
      }
    }
  }

  // 2. Entitlements complementarios del contexto (si existen)
  if (Array.isArray(context.entitlements)) {
    for (const ent of context.entitlements) {
      const eStr = String(ent);
      if (eStr.trim().length > 0 && eStr !== '*' && eStr !== 'ALL') {
        effective.add(eStr.toUpperCase());
      }
    }
  }

  // 3. Remover módulos explícitamente deshabilitados en contrato
  if (sub && Array.isArray(sub.disabledFeatures)) {
    for (const disabled of sub.disabledFeatures) {
      effective.delete(disabled.toUpperCase());
    }
  }

  return effective;
}

/**
 * Evaluador Principal: Determina si el usuario en su contexto puede acceder a un módulo específico.
 */
export function canAccessModule(
  context: GatekeeperContext,
  module: CapabilityModule | string,
  now: number = Date.now()
): AccessDecision {
  const timestamp = now;

  // 1. Validación de Contexto
  const contextCheck = validateContext(context);
  if (!contextCheck.isValid) {
    return {
      allowed: false,
      reason: contextCheck.reason || 'CONTEXT_INVALID',
      module: String(module),
      tenantId: context?.tenantId,
      timestamp
    };
  }

  // 2. Módulo existente en Catálogo
  const modKey = String(module).toUpperCase();
  const moduleDef = MODULE_CATALOG[modKey];
  if (!moduleDef) {
    return {
      allowed: false,
      reason: 'MODULE_UNKNOWN',
      module: modKey,
      tenantId: context.tenantId,
      timestamp
    };
  }

  // 3. Validación de Suscripción (Default Deny si está inactiva/expirada/mismatched)
  const subCheck = evaluateSubscription(context, now);
  if (!subCheck.isValid) {
    return {
      allowed: false,
      reason: subCheck.reason,
      module: modKey,
      tenantId: context.tenantId,
      timestamp
    };
  }

  // 4. Verificación de Rol (El rol del usuario debe estar soportado por el módulo)
  const normalizedRole = context.role.toUpperCase();
  if (!moduleDef.supportedRoles.map(r => r.toUpperCase()).includes(normalizedRole)) {
    return {
      allowed: false,
      reason: 'ROLE_UNAUTHORIZED',
      module: modKey,
      tenantId: context.tenantId,
      timestamp
    };
  }

  // 5. Verificación de Entitlements Requeridos (Contractual Gate)
  const effectiveEntitlements = getEffectiveEntitlements(context);
  const missingEntitlements = moduleDef.requiredEntitlements.filter(
    req => !effectiveEntitlements.has(req.toUpperCase())
  );

  if (missingEntitlements.length > 0) {
    return {
      allowed: false,
      reason: 'ENTITLEMENT_MISSING',
      module: modKey,
      requiredEntitlements: missingEntitlements,
      tenantId: context.tenantId,
      timestamp
    };
  }

  // Acceso Concedido
  return {
    allowed: true,
    reason: 'ALLOWED',
    module: modKey,
    requiredEntitlements: moduleDef.requiredEntitlements,
    tenantId: context.tenantId,
    timestamp
  };
}

/**
 * Evalúa si el contexto posee un entitlement granular específico.
 */
export function hasEntitlement(
  context: GatekeeperContext,
  entitlement: CapabilityModule | string,
  now: number = Date.now()
): AccessDecision {
  const timestamp = now;

  const contextCheck = validateContext(context);
  if (!contextCheck.isValid) {
    return {
      allowed: false,
      reason: contextCheck.reason || 'CONTEXT_INVALID',
      requiredEntitlements: [String(entitlement)],
      tenantId: context?.tenantId,
      timestamp
    };
  }

  const subCheck = evaluateSubscription(context, now);
  if (!subCheck.isValid) {
    return {
      allowed: false,
      reason: subCheck.reason,
      requiredEntitlements: [String(entitlement)],
      tenantId: context.tenantId,
      timestamp
    };
  }

  const entKey = String(entitlement).toUpperCase();
  const effective = getEffectiveEntitlements(context);

  if (!effective.has(entKey)) {
    return {
      allowed: false,
      reason: 'ENTITLEMENT_MISSING',
      requiredEntitlements: [entKey],
      tenantId: context.tenantId,
      timestamp
    };
  }

  return {
    allowed: true,
    reason: 'ALLOWED',
    requiredEntitlements: [entKey],
    tenantId: context.tenantId,
    timestamp
  };
}

/**
 * Evalúa cuotas de uso contractuales (Quotas Engine).
 */
export function checkQuota(
  context: GatekeeperContext,
  quotaKey: keyof SubscriptionQuotas | string,
  requestedAmount: number = 1,
  currentUsage: number = 0,
  now: number = Date.now()
): QuotaDecision {
  const subCheck = evaluateSubscription(context, now);
  if (!subCheck.isValid) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_INVALID',
      quotaKey: String(quotaKey),
      currentUsage,
      limit: 0,
      requestedAmount,
      remaining: 0
    };
  }

  const limits = context.subscription?.limits as Record<string, any> | undefined;
  if (!limits || limits[quotaKey] === undefined) {
    return {
      allowed: false,
      reason: 'QUOTA_UNDEFINED',
      quotaKey: String(quotaKey),
      currentUsage,
      limit: 0,
      requestedAmount,
      remaining: 0
    };
  }

  const limit = Number(limits[quotaKey]);

  // -1 representa ilimitado
  if (limit === -1) {
    return {
      allowed: true,
      reason: 'QUOTA_AVAILABLE',
      quotaKey: String(quotaKey),
      currentUsage,
      limit: -1,
      requestedAmount,
      remaining: -1
    };
  }

  if (currentUsage >= limit) {
    return {
      allowed: false,
      reason: 'QUOTA_REACHED',
      quotaKey: String(quotaKey),
      currentUsage,
      limit,
      requestedAmount,
      remaining: 0
    };
  }

  if (currentUsage + requestedAmount > limit) {
    return {
      allowed: false,
      reason: 'QUOTA_EXCEEDED',
      quotaKey: String(quotaKey),
      currentUsage,
      limit,
      requestedAmount,
      remaining: Math.max(0, limit - currentUsage)
    };
  }

  return {
    allowed: true,
    reason: 'QUOTA_AVAILABLE',
    quotaKey: String(quotaKey),
    currentUsage,
    limit,
    requestedAmount,
    remaining: limit - (currentUsage + requestedAmount)
  };
}

/**
 * Resuelve la intersección de capacidades efectivas para el rol y la suscripción activa.
 */
export function resolveEffectiveCapabilities(
  context: GatekeeperContext,
  now: number = Date.now()
): string[] {
  const capabilities = new Set<string>();

  const contextCheck = validateContext(context);
  if (!contextCheck.isValid) return [];

  const subCheck = evaluateSubscription(context, now);
  if (!subCheck.isValid) return [];

  const normalizedRole = context.role.toUpperCase();

  for (const [modKey, modDef] of Object.entries(MODULE_CATALOG)) {
    const access = canAccessModule(context, modKey as CapabilityModule, now);
    if (access.allowed) {
      const roleCaps = modDef.roleCapabilities[normalizedRole] || [];
      for (const cap of roleCaps) {
        capabilities.add(`${modKey}:${cap}`);
      }
    }
  }

  return Array.from(capabilities);
}
