/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 PROVISIONING DOMAIN (FASE 2C.9)
 * Modelos de Dominio y Contratos de Auto-Provisión EIAM v3.
 */

export interface EiamV3ProvisioningRequest {
  applicationId: string;
  approvedBy: string;
}

export interface DocumentMetadata {
  storagePath: string;
  name: string;
  type: string;
}

export interface MerchantApplicationInput {
  appId: string;
  businessName: string;
  legalName: string;
  ruc: string;
  address: string;
  city: string;
  zone?: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  ownerUid?: string;
  documents?: DocumentMetadata[];
  status: 'PENDING' | 'UNDER_REVIEW' | 'DOCS_REQUESTED' | 'APPROVED' | 'REJECTED' | 'ONBOARDING' | 'ACTIVE';
}

export interface TenantPlan {
  tenantId: string;
  displayName: string;
  legalName: string;
  ruc: string;
  subscriptionId: string;
  status: 'ACTIVE';
  createdAt: number;
}

export interface BrandPlan {
  brandId: string;
  tenantId: string;
  name: string;
  status: 'ACTIVE';
}

export interface SubscriptionPlan {
  subscriptionId: string;
  tenantId: string;
  planType: 'STANDARD' | 'ENTERPRISE';
  status: 'ACTIVE';
  validUntil: number;
}

export interface OrganizationPlan {
  orgId: string;
  tenantId: string;
  name: string;
  ownerUid: string;
}

export interface BusinessPlan {
  businessId: string;
  tenantId: string;
  brandId: string;
  orgId: string;
  name: string;
  ownerUid: string;
  category: string;
  documents: DocumentMetadata[];
}

export interface BranchPlan {
  branchId: string;
  tenantId: string;
  brandId: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  isMain: boolean;
}

export interface MembershipV3Plan {
  membershipId: string;
  uid: string;
  tenantId: string;
  brandId: string;
  organizationId: string;
  businessId: string;
  branchId: string;
  role: 'OWNER';
  status: 'ACTIVE';
  permissions: string[];
  createdAt: number;
  updatedAt: number;
  schemaVersion: '3.0';
}

export interface LegacyMembershipPlan {
  membershipId: string;
  uid: string;
  businessId: string;
  branchId: string;
  role: 'OWNER';
  status: 'ACTIVE';
}

export interface UserContextPlan {
  uid: string;
  email: string;
  contactName: string;
  phone: string;
  role: 'MERCHANT_OWNER';
  status: 'ACTIVE';
}

export interface EiamV3ProvisioningPlan {
  idempotencyKey: string;
  applicationId: string;
  approvedBy: string;
  tenant: TenantPlan;
  brand: BrandPlan;
  subscription: SubscriptionPlan;
  organization: OrganizationPlan;
  business: BusinessPlan;
  branch: BranchPlan;
  membershipV3: MembershipV3Plan;
  legacyMembership: LegacyMembershipPlan;
  userContext: UserContextPlan;
  simulation: true;
  createdAt: number;
}

export interface ProvisioningResult {
  success: boolean;
  status: 'PROVISIONED_SIMULATION' | 'SAFE_EXISTING' | 'PROVISIONING_CONFLICT' | 'BLOCKED_INVALID_STATE' | 'BLOCKED_BY_SAFETY_LOCK';
  idempotencyKey: string;
  plan?: EiamV3ProvisioningPlan;
  simulatedClaims?: Record<string, any>;
  errors?: string[];
}
