/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 WEB INTEGRATION (FASE 2C.8)
 * Modelos de Dominio y Contratos para Merchant Web.
 */

export type WebResolutionStatus =
  | 'UNINITIALIZED'
  | 'LOADING'
  | 'RESOLVED_V3'
  | 'RESOLVED_LEGACY'
  | 'MIGRATION_PENDING'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'SECURITY_MISMATCH'
  | 'NEVER_RESOLVE'
  | 'ERROR'
  | 'LOGGED_OUT'
  | 'LEGACY_ONLY';

export interface WebActiveTenantContext {
  membershipId: string;
  tenantId: string;
  brandId: string | null;
  organizationId: string | null;
  businessId: string | null;
  branchId: string | null;
  role: string;
  status: 'ACTIVE';
}

export interface WebTenantSettings {
  tenantId: string;
  brandId?: string | null;
  organizationId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  displayName: string;
  legalName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
  features?: Record<string, boolean>;
}

export interface WebMembershipOption {
  membershipId: string;
  tenantId: string;
  brandId: string | null;
  businessId: string | null;
  branchId: string | null;
  role: string;
  source: 'V3' | 'LEGACY';
  label: string;
}
