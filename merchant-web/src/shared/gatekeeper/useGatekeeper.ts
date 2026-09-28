/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WEB GATEKEEPER HOOK (FASE 2D.11)
 * Evaluador Dinámico de Módulos, Entitlements y Roles para UI Web Shell
 * 
 * Regla Canónica:
 * EFFECTIVE_ACCESS = ROLE_PERMISSIONS ∩ SUBSCRIPTION_ENTITLEMENTS ∩ TENANT_CONTEXT
 */

import { useCallback } from 'react';
import { CapabilityModule, AccessDecision } from './types';
import { useTenant } from '../eiam/TenantContext';

export const TAB_TO_CAPABILITY_MAP: Record<string, CapabilityModule> = {
  dashboard: 'DASHBOARD',
  orders: 'ORDERS',
  delivery: 'CONTROL_TOWER',
  'courier-cash': 'FLEET_CASH_CONTROL',
  'cajademotorizados': 'FLEET_CASH_CONTROL',
  'caja': 'FLEET_CASH_CONTROL',
  'caja-motorizados': 'FLEET_CASH_CONTROL',
  'couriercash': 'FLEET_CASH_CONTROL',
  'courier_cash': 'FLEET_CASH_CONTROL',
  catalog: 'CATALOG',
  promotions: 'PROMOTIONS',
  customers: 'CUSTOMERS',
  finance: 'FINANCE',
  settings: 'SETTINGS',
  staff: 'STAFF',
  reports: 'REPORTS',
  communication: 'NOTIFICATIONS',
  onboarding: 'ONBOARDING'
};

export const ROLE_RESTRICTIONS: Record<string, CapabilityModule[]> = {
  COOK: ['ORDERS', 'DASHBOARD', 'ONBOARDING'],
  BRANCH_STAFF: ['ORDERS', 'DASHBOARD', 'ONBOARDING'],
  CASHIER: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'FINANCE', 'DASHBOARD', 'ONBOARDING'],
  STORE_MANAGER: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE', 'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'DASHBOARD', 'ONBOARDING'],
  MANAGER: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE', 'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'DASHBOARD', 'ONBOARDING'],
  ADMIN: ['DASHBOARD', 'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE', 'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'SETTINGS', 'STAFF', 'MULTI_BRANCH', 'ONBOARDING'],
  MERCHANT_ADMIN: ['DASHBOARD', 'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE', 'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'SETTINGS', 'STAFF', 'MULTI_BRANCH', 'ONBOARDING'],
  OWNER: ['DASHBOARD', 'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE', 'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'ANALYTICS', 'GOVERNANCE', 'MULTI_BRANCH', 'MULTI_BRAND', 'API_ACCESS', 'SETTINGS', 'STAFF', 'ONBOARDING'],
  MERCHANT_OWNER: ['DASHBOARD', 'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE', 'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'ANALYTICS', 'GOVERNANCE', 'MULTI_BRANCH', 'MULTI_BRAND', 'API_ACCESS', 'SETTINGS', 'STAFF', 'ONBOARDING']
};

export function useGatekeeper() {
  const { activeTenant, settings, status: tenantStatus, isLoading: isTenantLoading } = useTenant();

  const isModuleEnabled = useCallback((moduleOrTabKey: CapabilityModule | string): AccessDecision => {
    const rawKey = String(moduleOrTabKey).toLowerCase();
    const capability: CapabilityModule = TAB_TO_CAPABILITY_MAP[rawKey] || (String(moduleOrTabKey).toUpperCase() as CapabilityModule);
    const tenantId = activeTenant?.tenantId || null;
    const role = (activeTenant?.role || 'GUEST').toUpperCase();

    // 1. Base public or always-allowed modules
    if (capability === 'ONBOARDING') {
      return { allowed: true, reason: 'ALLOWED_ONBOARDING', module: capability, role, tenantId };
    }

    // 2. Si el Tenant aún está resolviéndose -> Estado en transición
    if (isTenantLoading || tenantStatus === 'LOADING' || tenantStatus === 'UNINITIALIZED') {
      return { allowed: false, reason: 'TENANT_RESOLVING', module: capability, role, tenantId: null };
    }

    // 3. Si no hay tenant activo definitivo -> Deny
    if (!activeTenant) {
      return { allowed: false, reason: 'NO_ACTIVE_TENANT', module: capability, role, tenantId: null };
    }

    // 4. Validación de Rol
    const allowedForRole = ROLE_RESTRICTIONS[role] || ROLE_RESTRICTIONS.OWNER;
    if (!allowedForRole.includes(capability)) {
      return {
        allowed: false,
        reason: 'ROLE_UNAUTHORIZED_FOR_MODULE',
        module: capability,
        role,
        tenantId
      };
    }

    // 5. Feature Flags dinámicos desde TenantSettings
    const features = settings?.features;
    if (features && features[capability] === false) {
      return {
        allowed: false,
        reason: 'MODULE_DISABLED_BY_TENANT_FEATURE_FLAG',
        module: capability,
        role,
        tenantId
      };
    }

    // 6. Verificación de Entitlements explícitos en Membership/Context (si están configurados)
    const permissions = (activeTenant as any)?.permissions;
    if (Array.isArray(permissions) && permissions.length > 0) {
      const hasDirectPermission = permissions.some((p: string) => {
        const pUp = String(p).toUpperCase();
        return pUp === capability || pUp.startsWith(`${capability}:`) || pUp.startsWith(`${capability}_`) || pUp === '*';
      });

      // Si tiene lista de permisos explícitos y no está incluido, denegar
      if (!hasDirectPermission && capability !== 'DASHBOARD' && capability !== 'SETTINGS') {
        return {
          allowed: false,
          reason: 'ENTITLEMENT_MISSING',
          module: capability,
          role,
          tenantId
        };
      }
    }

    return {
      allowed: true,
      reason: 'ALLOWED',
      module: capability,
      role,
      tenantId
    };
  }, [activeTenant, settings, tenantStatus, isTenantLoading]);

  return {
    isModuleEnabled,
    activeRole: activeTenant?.role || 'GUEST',
    tenantId: activeTenant?.tenantId || null
  };
}
