"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.STG_ATTACKER = exports.STG_APP_INPUT_B = exports.STG_APP_INPUT_A = exports.STG_MEMBERSHIP_LEGACY_B = exports.STG_MEMBERSHIP_LEGACY_A = exports.STG_MEMBERSHIP_V3_B = exports.STG_MEMBERSHIP_V3_A = exports.STG_USERS = exports.STG_BRANCH_B = exports.STG_BUSINESS_B = exports.STG_ORG_B = exports.STG_BRAND_B = exports.STG_TENANT_B = exports.STG_BRANCH_A = exports.STG_BUSINESS_A = exports.STG_ORG_A = exports.STG_BRAND_A = exports.STG_TENANT_A = void 0;
// ─── STAGING TENANT A ──────────────────────────────────────────────────────────
exports.STG_TENANT_A = {
    tenantId: 'stg-ten-alpha-001',
    name: 'Staging Tenant Alpha',
    slug: 'stg-alpha',
    environment: 'EMULATOR_LOCAL'
};
exports.STG_BRAND_A = {
    brandId: 'stg-br-alpha-001',
    name: 'STG Brand Alpha',
    tenantId: exports.STG_TENANT_A.tenantId
};
exports.STG_ORG_A = {
    orgId: 'stg-org-alpha-001',
    legalName: 'STG Alpha Corp S.A.',
    tenantId: exports.STG_TENANT_A.tenantId,
    brandId: exports.STG_BRAND_A.brandId
};
exports.STG_BUSINESS_A = {
    businessId: 'stg-biz-alpha-001',
    name: 'STG Alpha Restaurant',
    tenantId: exports.STG_TENANT_A.tenantId,
    brandId: exports.STG_BRAND_A.brandId,
    orgId: exports.STG_ORG_A.orgId
};
exports.STG_BRANCH_A = {
    branchId: 'stg-branch-alpha-001',
    name: 'STG Alpha - Sucursal Central',
    businessId: exports.STG_BUSINESS_A.businessId,
    tenantId: exports.STG_TENANT_A.tenantId,
    isMain: true
};
// ─── STAGING TENANT B ──────────────────────────────────────────────────────────
exports.STG_TENANT_B = {
    tenantId: 'stg-ten-beta-001',
    name: 'Staging Tenant Beta',
    slug: 'stg-beta',
    environment: 'EMULATOR_LOCAL'
};
exports.STG_BRAND_B = {
    brandId: 'stg-br-beta-001',
    name: 'STG Brand Beta',
    tenantId: exports.STG_TENANT_B.tenantId
};
exports.STG_ORG_B = {
    orgId: 'stg-org-beta-001',
    legalName: 'STG Beta Corp S.A.',
    tenantId: exports.STG_TENANT_B.tenantId,
    brandId: exports.STG_BRAND_B.brandId
};
exports.STG_BUSINESS_B = {
    businessId: 'stg-biz-beta-001',
    name: 'STG Beta Pizza',
    tenantId: exports.STG_TENANT_B.tenantId,
    brandId: exports.STG_BRAND_B.brandId,
    orgId: exports.STG_ORG_B.orgId
};
exports.STG_BRANCH_B = {
    branchId: 'stg-branch-beta-001',
    name: 'STG Beta - Sucursal Norte',
    businessId: exports.STG_BUSINESS_B.businessId,
    tenantId: exports.STG_TENANT_B.tenantId,
    isMain: true
};
// ─── STAGING USERS (SINTÉTICOS — SIN UIDS PRODUCTIVOS) ────────────────────────
exports.STG_USERS = {
    ownerA: {
        uid: 'stg-usr-owner-alpha-001',
        email: 'owner-a@stg.emulator.local',
        displayName: 'STG Owner Alpha',
        tenantId: exports.STG_TENANT_A.tenantId,
        role: 'OWNER'
    },
    ownerB: {
        uid: 'stg-usr-owner-beta-001',
        email: 'owner-b@stg.emulator.local',
        displayName: 'STG Owner Beta',
        tenantId: exports.STG_TENANT_B.tenantId,
        role: 'OWNER'
    },
    staffA: {
        uid: 'stg-usr-staff-alpha-001',
        email: 'staff-a@stg.emulator.local',
        displayName: 'STG Staff Alpha',
        tenantId: exports.STG_TENANT_A.tenantId,
        role: 'STAFF'
    },
    staffB: {
        uid: 'stg-usr-staff-beta-001',
        email: 'staff-b@stg.emulator.local',
        displayName: 'STG Staff Beta',
        tenantId: exports.STG_TENANT_B.tenantId,
        role: 'STAFF'
    },
    courierA: {
        uid: 'stg-usr-courier-alpha-001',
        email: 'courier-a@stg.emulator.local',
        displayName: 'STG Courier Alpha',
        tenantId: exports.STG_TENANT_A.tenantId,
        role: 'COURIER'
    },
    adminTest: {
        uid: 'stg-usr-admin-test-001',
        email: 'admin-test@stg.emulator.local',
        displayName: 'STG Admin Test',
        tenantId: exports.STG_TENANT_A.tenantId,
        role: 'TENANT_ADMIN'
    },
    platformAdminTest: {
        uid: 'stg-usr-platform-admin-001',
        email: 'platform-admin@stg.emulator.local',
        displayName: 'STG Platform Admin',
        tenantId: null, // SUPER_ADMIN tiene tenantId=null
        role: 'SUPER_ADMIN'
    }
};
// ─── MEMBERSHIPS V3 SINTÉTICAS ─────────────────────────────────────────────────
exports.STG_MEMBERSHIP_V3_A = {
    membershipId: 'stg-mem-v3-alpha-001',
    uid: exports.STG_USERS.ownerA.uid,
    tenantId: exports.STG_TENANT_A.tenantId,
    brandId: exports.STG_BRAND_A.brandId,
    organizationId: exports.STG_ORG_A.orgId,
    businessId: exports.STG_BUSINESS_A.businessId,
    branchId: exports.STG_BRANCH_A.branchId,
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_STAFF'],
    createdAt: 1724435885000,
    updatedAt: 1724435885000,
    schemaVersion: '3.0'
};
exports.STG_MEMBERSHIP_V3_B = {
    membershipId: 'stg-mem-v3-beta-001',
    uid: exports.STG_USERS.ownerB.uid,
    tenantId: exports.STG_TENANT_B.tenantId,
    brandId: exports.STG_BRAND_B.brandId,
    organizationId: exports.STG_ORG_B.orgId,
    businessId: exports.STG_BUSINESS_B.businessId,
    branchId: exports.STG_BRANCH_B.branchId,
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS'],
    createdAt: 1724435885000,
    updatedAt: 1724435885000,
    schemaVersion: '3.0'
};
// ─── MEMBERSHIPS LEGACY SINTÉTICAS ─────────────────────────────────────────────
exports.STG_MEMBERSHIP_LEGACY_A = {
    membershipId: 'stg-mem-leg-alpha-001',
    uid: exports.STG_USERS.ownerA.uid,
    businessId: exports.STG_BUSINESS_A.businessId,
    orgId: exports.STG_ORG_A.orgId,
    branchId: exports.STG_BRANCH_A.branchId,
    role: 'merchant_owner',
    status: 'ACTIVE'
};
exports.STG_MEMBERSHIP_LEGACY_B = {
    membershipId: 'stg-mem-leg-beta-001',
    uid: exports.STG_USERS.ownerB.uid,
    businessId: exports.STG_BUSINESS_B.businessId,
    orgId: exports.STG_ORG_B.orgId,
    branchId: exports.STG_BRANCH_B.branchId,
    role: 'merchant_owner',
    status: 'ACTIVE'
};
// ─── MERCHANT APPLICATION INPUTS SINTÉTICOS ────────────────────────────────────
exports.STG_APP_INPUT_A = {
    appId: 'stg-app-alpha-001',
    businessName: 'STG Alpha Restaurant',
    legalName: 'STG Alpha Corp S.A.',
    ruc: 'J-STG-11111-1',
    address: 'Calle Staging 1, Emulator City',
    city: 'Emulator City',
    category: 'RESTAURANT',
    contactName: 'STG Alpha Owner',
    phone: '+580001234567',
    email: 'owner-a@stg.emulator.local',
    ownerUid: exports.STG_USERS.ownerA.uid,
    status: 'APPROVED'
};
exports.STG_APP_INPUT_B = {
    appId: 'stg-app-beta-001',
    businessName: 'STG Beta Pizza',
    legalName: 'STG Beta Corp S.A.',
    ruc: 'J-STG-22222-2',
    address: 'Avenida Staging 2, Emulator City',
    city: 'Emulator City',
    category: 'RESTAURANT',
    contactName: 'STG Beta Owner',
    phone: '+580007654321',
    email: 'owner-b@stg.emulator.local',
    ownerUid: exports.STG_USERS.ownerB.uid,
    status: 'APPROVED'
};
// ─── ADVERSARIAL USER (para cross-tenant tests) ────────────────────────────────
exports.STG_ATTACKER = {
    uid: 'stg-usr-attacker-x-001',
    email: 'attacker@stg.emulator.local',
    displayName: 'STG Adversarial User (Cross-Tenant Test)',
    tenantId: exports.STG_TENANT_B.tenantId, // pertenece a B pero intentará acceder a A
    role: 'OWNER'
};
//# sourceMappingURL=stagingFixtures.js.map