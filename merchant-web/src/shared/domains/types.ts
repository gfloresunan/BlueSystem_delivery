/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WEB DOMAIN & MULTI-TENANT TYPES (FASE 2E)
 */

import { BrandVisualConfig } from '../branding/types';

export type WebDomainType = 'PLATFORM' | 'TENANT_SUBDOMAIN' | 'CUSTOM_DOMAIN';

export type WebDomainStatus = 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'ACTIVE' | 'DISABLED' | 'ERROR';

export interface WebTenantDomainEntity {
  domainId: string;
  tenantId: string;
  brandId?: string | null;
  domain: string;
  domainType: WebDomainType;
  status: WebDomainStatus;
  isPrimary: boolean;
  isCustom: boolean;
  isSubdomain: boolean;
  dnsStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  sslStatus: string;
  createdAt: number;
}

export type WebDomainResolutionStatus = 
  | 'INITIALIZING'
  | 'RESOLVED'
  | 'UNKNOWN_DOMAIN'
  | 'INACTIVE_DOMAIN'
  | 'SUSPENDED_TENANT'
  | 'TENANT_MISMATCH'
  | 'CONFIGURATION_ERROR';

export interface WebDomainResolutionResult {
  status: WebDomainResolutionStatus;
  hostname: string;
  tenantId?: string;
  brandId?: string;
  isPlatformRoot: boolean;
  domainEntity?: WebTenantDomainEntity;
  branding?: Partial<BrandVisualConfig>;
  displayName?: string;
  errorDetail?: string;
}
