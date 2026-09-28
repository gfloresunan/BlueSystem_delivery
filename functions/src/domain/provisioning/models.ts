/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — AUTOMATED TENANT PROVISIONING DOMAIN (FASE 2D.4 / C2D.4)
 * Canonical Schemas, Contracts, and Data Types for Transactional & Idempotent Tenant Provisioning
 * 
 * STRICTLY ISOLATED DOMAIN CONTRACTS (Zero Production Mutation / Pure In-Memory)
 */

import {
  CommercialModel,
  TenantStatus,
  BrandStatus,
  SubscriptionStatus,
  PlanTier,
  CapabilityModule,
  TenantEntity,
  BrandEntity,
  BusinessEntity,
  BranchEntity,
  SubscriptionEntity,
  EntitlementEntity,
  BrandVisualConfig,
  SubscriptionQuotas
} from '../platform/models';
import { EiamRole, MembershipStatus, MembershipV3Entity } from '../identity/models';

// ─── 1. TENANT LIFECYCLE STATES ──────────────────────────────────────────────
export type TenantLifecycleState = 
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'ARCHIVED';

export interface LifecycleTransitionResult {
  allowed: boolean;
  fromState: TenantLifecycleState;
  toState: TenantLifecycleState;
  reason: string;
}

// ─── 2. INITIAL TENANT CONFIGURATION (NO SECRETS ALLOWED) ────────────────────
export interface InitialTenantConfiguration {
  locale: string;                        // ej. "es_MX"
  currency: string;                      // ej. "MXN", "USD"
  timezone: string;                      // ej. "America/Mexico_City"
  deliverySettings: {
    defaultRadiusKm: number;
    baseFare: number;
    perKmFare: number;
    autoDispatchEnabled: boolean;
  };
  orderSettings: {
    preparationTimeMinutes: number;
    allowScheduledOrders: boolean;
    autoAcceptOrders: boolean;
  };
  brandingDefaults?: {
    primaryColor?: string;
    secondaryColor?: string;
    appName?: string;
  };
  notificationPreferences: {
    orderStatusUpdates: boolean;
    promotionalPush: boolean;
    soundAlertsEnabled: boolean;
  };
  operationalDefaults: {
    operatingHours?: {
      open: string;
      close: string;
    };
    cashDrawerClosingRequired: boolean;
  };
  featureConfiguration?: Record<string, boolean>;
}

// ─── 3. PROVISIONING REQUEST INPUT CONTRACT ──────────────────────────────────
export interface ProvisioningTenantInput {
  tenantId: string;
  name: string;
  legalName: string;
  slug: string;
  type: CommercialModel;
}

export interface ProvisioningBrandInput {
  brandId: string;
  displayName: string;
  shortName: string;
  slug: string;
  visual?: Partial<BrandVisualConfig>;
  metadata?: {
    supportEmail: string;
    supportPhone: string;
    website?: string;
  };
}

export interface ProvisioningBusinessInput {
  businessId: string;
  brandId: string;
  organizationId?: string;
  name: string;
  category: string;
  deliveryRadiusKm?: number;
}

export interface ProvisioningBranchInput {
  branchId: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isMainBranch: boolean;
}

export interface ProvisioningSubscriptionInput {
  subscriptionId: string;
  planTier: PlanTier;
  planName?: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'CUSTOM';
  startDate?: number;
  endDate?: number | null;
  customFeatures?: CapabilityModule[];
  customQuotas?: Partial<SubscriptionQuotas>;
}

export interface ProvisioningOwnerInput {
  uid: string;
  role: EiamRole;
  email?: string;
  displayName?: string;
}

export interface ProvisioningRequest {
  requestId: string;
  idempotencyKey: string;
  tenantType: CommercialModel;
  tenant: ProvisioningTenantInput;
  brand: ProvisioningBrandInput;
  business: ProvisioningBusinessInput;
  branch: ProvisioningBranchInput;
  subscription: ProvisioningSubscriptionInput;
  initialOwner: ProvisioningOwnerInput;
  initialConfiguration: InitialTenantConfiguration;
  requestedBy: string;
  requestedAt: number;
}

// ─── 4. FAILURE INJECTION CONTROLLER ─────────────────────────────────────────
export type FailureInjectionStep =
  | 'NONE'
  | 'VALIDATION'
  | 'TENANT'
  | 'BRAND'
  | 'BUSINESS'
  | 'BRANCH'
  | 'SUBSCRIPTION'
  | 'ENTITLEMENTS'
  | 'MEMBERSHIP'
  | 'INITIAL_CONFIGURATION'
  | 'FINAL_VALIDATION';

// ─── 5. AUDIT EVENT ──────────────────────────────────────────────────────────
export type ProvisioningAuditStatus = 'SUCCESS' | 'FAILED' | 'REVERTED' | 'REPLAYED' | 'SKIPPED';

export interface ProvisioningAuditEvent {
  eventId: string;
  requestId: string;
  idempotencyKey: string;
  tenantId: string;
  operation: string;
  step: string;
  status: ProvisioningAuditStatus;
  reason?: string;
  timestamp: number;
  details?: Record<string, any>;
}

// ─── 6. PROVISIONED AGGREGATE ────────────────────────────────────────────────
export interface ProvisionedTenantAggregate {
  tenant: TenantEntity;
  brand: BrandEntity;
  businesses: BusinessEntity[];
  branches: BranchEntity[];
  subscription: SubscriptionEntity;
  entitlements: CapabilityModule[];
  memberships: MembershipV3Entity[];
  initialConfiguration: InitialTenantConfiguration;
  status: TenantLifecycleState;
  createdAt: number;
  updatedAt: number;
}

// ─── 7. PROVISIONING RESULT ──────────────────────────────────────────────────
export type ProvisioningExecutionStatus = 
  | 'PLANNED'
  | 'VALIDATED'
  | 'SIMULATED'
  | 'COMPLETED'
  | 'FAILED'
  | 'COMPENSATED'
  | 'REPLAYED'
  | 'CONFLICT';

export interface ProvisioningResult {
  requestId: string;
  idempotencyKey: string;
  status: ProvisioningExecutionStatus;
  aggregate?: ProvisionedTenantAggregate;
  failureStep?: FailureInjectionStep;
  errorDetails?: string[];
  auditTrail: ProvisioningAuditEvent[];
  timestamp: number;
}
