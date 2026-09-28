/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — GATEKEEPER DOMAIN MODELS (FASE 2D.3)
 * Contratos de Dominio para Evaluación de Suscripciones, Entitlements y Cuotas
 */

import { CapabilityModule, SubscriptionEntity, SubscriptionQuotas } from '../platform/models';

export type AccessDecisionReason =
  | 'ALLOWED'
  | 'SUBSCRIPTION_MISSING'
  | 'SUBSCRIPTION_INACTIVE'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_FUTURE'
  | 'TENANT_MISMATCH'
  | 'BRAND_MISMATCH'
  | 'BUSINESS_MISMATCH'
  | 'ENTITLEMENT_MISSING'
  | 'MODULE_UNKNOWN'
  | 'ROLE_UNAUTHORIZED'
  | 'CONTEXT_INVALID';

export interface GatekeeperContext {
  uid: string;
  membershipId: string;
  tenantId: string;
  organizationId?: string | null;
  brandId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  role: string; // 'OWNER' | 'MANAGER' | 'CASHIER' | 'ADMIN' | 'COOK' | etc.
  subscription?: Partial<SubscriptionEntity> | null;
  entitlements?: (CapabilityModule | string)[];
}

export interface AccessDecision {
  allowed: boolean;
  reason: AccessDecisionReason;
  module?: string;
  requiredEntitlements?: string[];
  tenantId?: string;
  timestamp: number;
}

export type QuotaDecisionReason =
  | 'QUOTA_AVAILABLE'
  | 'QUOTA_REACHED'
  | 'QUOTA_EXCEEDED'
  | 'QUOTA_UNDEFINED'
  | 'SUBSCRIPTION_INVALID';

export interface QuotaDecision {
  allowed: boolean;
  reason: QuotaDecisionReason;
  quotaKey: string;
  currentUsage: number;
  limit: number;
  requestedAmount: number;
  remaining: number;
}
