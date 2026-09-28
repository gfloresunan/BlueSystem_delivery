/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 STAGING FIXTURES (FASE 2C.12)
 * Datos Sintéticos para Staging / Shadow Run
 *
 * REGLA ABSOLUTA:
 * - SIN datos reales de clientes
 * - SIN UIDs productivos
 * - SIN documentos copiados de Firestore producción
 * - SIN credenciales reales
 *
 * Solo datos sintéticos completamente ficticios para staging controlado.
 */

import type { MembershipV3Entity, LegacyMembershipRecord } from '../domain/identity/models';

// ─── STAGING TENANT A ──────────────────────────────────────────────────────────
export const STG_TENANT_A = {
  tenantId: 'stg-ten-alpha-001',
  name: 'Staging Tenant Alpha',
  slug: 'stg-alpha',
  environment: 'EMULATOR_LOCAL' as const
};

export const STG_BRAND_A = {
  brandId: 'stg-br-alpha-001',
  name: 'STG Brand Alpha',
  tenantId: STG_TENANT_A.tenantId
};

export const STG_ORG_A = {
  orgId: 'stg-org-alpha-001',
  legalName: 'STG Alpha Corp S.A.',
  tenantId: STG_TENANT_A.tenantId,
  brandId: STG_BRAND_A.brandId
};

export const STG_BUSINESS_A = {
  businessId: 'stg-biz-alpha-001',
  name: 'STG Alpha Restaurant',
  tenantId: STG_TENANT_A.tenantId,
  brandId: STG_BRAND_A.brandId,
  orgId: STG_ORG_A.orgId
};

export const STG_BRANCH_A = {
  branchId: 'stg-branch-alpha-001',
  name: 'STG Alpha - Sucursal Central',
  businessId: STG_BUSINESS_A.businessId,
  tenantId: STG_TENANT_A.tenantId,
  isMain: true
};

// ─── STAGING TENANT B ──────────────────────────────────────────────────────────
export const STG_TENANT_B = {
  tenantId: 'stg-ten-beta-001',
  name: 'Staging Tenant Beta',
  slug: 'stg-beta',
  environment: 'EMULATOR_LOCAL' as const
};

export const STG_BRAND_B = {
  brandId: 'stg-br-beta-001',
  name: 'STG Brand Beta',
  tenantId: STG_TENANT_B.tenantId
};

export const STG_ORG_B = {
  orgId: 'stg-org-beta-001',
  legalName: 'STG Beta Corp S.A.',
  tenantId: STG_TENANT_B.tenantId,
  brandId: STG_BRAND_B.brandId
};

export const STG_BUSINESS_B = {
  businessId: 'stg-biz-beta-001',
  name: 'STG Beta Pizza',
  tenantId: STG_TENANT_B.tenantId,
  brandId: STG_BRAND_B.brandId,
  orgId: STG_ORG_B.orgId
};

export const STG_BRANCH_B = {
  branchId: 'stg-branch-beta-001',
  name: 'STG Beta - Sucursal Norte',
  businessId: STG_BUSINESS_B.businessId,
  tenantId: STG_TENANT_B.tenantId,
  isMain: true
};

// ─── STAGING USERS (SINTÉTICOS — SIN UIDS PRODUCTIVOS) ────────────────────────
export const STG_USERS = {
  ownerA: {
    uid: 'stg-usr-owner-alpha-001',
    email: 'owner-a@stg.emulator.local',
    displayName: 'STG Owner Alpha',
    tenantId: STG_TENANT_A.tenantId,
    role: 'OWNER' as const
  },
  ownerB: {
    uid: 'stg-usr-owner-beta-001',
    email: 'owner-b@stg.emulator.local',
    displayName: 'STG Owner Beta',
    tenantId: STG_TENANT_B.tenantId,
    role: 'OWNER' as const
  },
  staffA: {
    uid: 'stg-usr-staff-alpha-001',
    email: 'staff-a@stg.emulator.local',
    displayName: 'STG Staff Alpha',
    tenantId: STG_TENANT_A.tenantId,
    role: 'STAFF' as const
  },
  staffB: {
    uid: 'stg-usr-staff-beta-001',
    email: 'staff-b@stg.emulator.local',
    displayName: 'STG Staff Beta',
    tenantId: STG_TENANT_B.tenantId,
    role: 'STAFF' as const
  },
  courierA: {
    uid: 'stg-usr-courier-alpha-001',
    email: 'courier-a@stg.emulator.local',
    displayName: 'STG Courier Alpha',
    tenantId: STG_TENANT_A.tenantId,
    role: 'COURIER' as const
  },
  adminTest: {
    uid: 'stg-usr-admin-test-001',
    email: 'admin-test@stg.emulator.local',
    displayName: 'STG Admin Test',
    tenantId: STG_TENANT_A.tenantId,
    role: 'TENANT_ADMIN' as const
  },
  platformAdminTest: {
    uid: 'stg-usr-platform-admin-001',
    email: 'platform-admin@stg.emulator.local',
    displayName: 'STG Platform Admin',
    tenantId: null, // SUPER_ADMIN tiene tenantId=null
    role: 'SUPER_ADMIN' as const
  }
} as const;

// ─── MEMBERSHIPS V3 SINTÉTICAS ─────────────────────────────────────────────────
export const STG_MEMBERSHIP_V3_A: MembershipV3Entity = {
  membershipId: 'stg-mem-v3-alpha-001',
  uid: STG_USERS.ownerA.uid,
  tenantId: STG_TENANT_A.tenantId,
  brandId: STG_BRAND_A.brandId,
  organizationId: STG_ORG_A.orgId,
  businessId: STG_BUSINESS_A.businessId,
  branchId: STG_BRANCH_A.branchId,
  role: 'OWNER',
  status: 'ACTIVE',
  permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_STAFF'],
  createdAt: 1724435885000,
  updatedAt: 1724435885000,
  schemaVersion: '3.0'
};

export const STG_MEMBERSHIP_V3_B: MembershipV3Entity = {
  membershipId: 'stg-mem-v3-beta-001',
  uid: STG_USERS.ownerB.uid,
  tenantId: STG_TENANT_B.tenantId,
  brandId: STG_BRAND_B.brandId,
  organizationId: STG_ORG_B.orgId,
  businessId: STG_BUSINESS_B.businessId,
  branchId: STG_BRANCH_B.branchId,
  role: 'OWNER',
  status: 'ACTIVE',
  permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS'],
  createdAt: 1724435885000,
  updatedAt: 1724435885000,
  schemaVersion: '3.0'
};

// ─── MEMBERSHIPS LEGACY SINTÉTICAS ─────────────────────────────────────────────
export const STG_MEMBERSHIP_LEGACY_A: LegacyMembershipRecord = {
  membershipId: 'stg-mem-leg-alpha-001',
  uid: STG_USERS.ownerA.uid,
  businessId: STG_BUSINESS_A.businessId,
  orgId: STG_ORG_A.orgId,
  branchId: STG_BRANCH_A.branchId,
  role: 'merchant_owner',
  status: 'ACTIVE'
};

export const STG_MEMBERSHIP_LEGACY_B: LegacyMembershipRecord = {
  membershipId: 'stg-mem-leg-beta-001',
  uid: STG_USERS.ownerB.uid,
  businessId: STG_BUSINESS_B.businessId,
  orgId: STG_ORG_B.orgId,
  branchId: STG_BRANCH_B.branchId,
  role: 'merchant_owner',
  status: 'ACTIVE'
};

// ─── MERCHANT APPLICATION INPUTS SINTÉTICOS ────────────────────────────────────
export const STG_APP_INPUT_A = {
  appId: 'stg-app-alpha-001',
  businessName: 'STG Alpha Restaurant',
  legalName: 'STG Alpha Corp S.A.',
  ruc: 'J-STG-11111-1',
  address: 'Calle Staging 1, Emulator City',
  city: 'Emulator City',
  category: 'RESTAURANT' as const,
  contactName: 'STG Alpha Owner',
  phone: '+580001234567',
  email: 'owner-a@stg.emulator.local',
  ownerUid: STG_USERS.ownerA.uid,
  status: 'APPROVED' as const
};

export const STG_APP_INPUT_B = {
  appId: 'stg-app-beta-001',
  businessName: 'STG Beta Pizza',
  legalName: 'STG Beta Corp S.A.',
  ruc: 'J-STG-22222-2',
  address: 'Avenida Staging 2, Emulator City',
  city: 'Emulator City',
  category: 'RESTAURANT' as const,
  contactName: 'STG Beta Owner',
  phone: '+580007654321',
  email: 'owner-b@stg.emulator.local',
  ownerUid: STG_USERS.ownerB.uid,
  status: 'APPROVED' as const
};

// ─── ADVERSARIAL USER (para cross-tenant tests) ────────────────────────────────
export const STG_ATTACKER = {
  uid: 'stg-usr-attacker-x-001',
  email: 'attacker@stg.emulator.local',
  displayName: 'STG Adversarial User (Cross-Tenant Test)',
  tenantId: STG_TENANT_B.tenantId, // pertenece a B pero intentará acceder a A
  role: 'OWNER' as const
};
