/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WEB GATEKEEPER TYPES (FASE 2D.11)
 * Tipos Canónicos de Control de Acceso y Capacidades para Merchant Web Shell
 */

export type CapabilityModule =
  | 'DASHBOARD'
  | 'ORDERS'
  | 'CATALOG'
  | 'CUSTOMERS'
  | 'PROMOTIONS'
  | 'FINANCE'
  | 'REPORTS'
  | 'CONTROL_TOWER'
  | 'FLEET_CORE'
  | 'GPS_TRACKING'
  | 'X_TO_Y_DELIVERY'
  | 'NOTIFICATIONS'
  | 'ANALYTICS'
  | 'GOVERNANCE'
  | 'MULTI_BRANCH'
  | 'MULTI_BRAND'
  | 'API_ACCESS'
  | 'SETTINGS'
  | 'STAFF'
  | 'ONBOARDING'
  | 'FLEET_CASH_CONTROL';

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  module?: string;
  requiredEntitlements?: string[];
  role?: string;
  tenantId?: string | null;
}
