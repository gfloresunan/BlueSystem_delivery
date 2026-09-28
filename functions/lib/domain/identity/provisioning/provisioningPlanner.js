"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 PROVISIONING DOMAIN (FASE 2C.9)
 * Planner Puro y Determinístico de Provisión EIAM v3 (Zero Side-Effects).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EiamV3ProvisioningPlanner = void 0;
function cleanSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 32);
}
class EiamV3ProvisioningPlanner {
    /**
     * Construye un Plan de Provisión puro y reproducible.
     */
    static buildPlan(app, approvedBy, options) {
        const errors = [];
        // 1. Validar estado APPROVED
        if (app.status !== 'APPROVED') {
            errors.push(`La aplicación se encuentra en estado '${app.status}'; solo aplicaciones en estado 'APPROVED' pueden ser provisionadas.`);
            return { isValid: false, errors };
        }
        // 2. Validar campos requeridos
        if (!app.appId || app.appId.trim().length === 0) {
            errors.push('appId es obligatorio.');
        }
        if (!app.businessName || app.businessName.trim().length === 0) {
            errors.push('businessName es obligatorio.');
        }
        if (!app.legalName || app.legalName.trim().length === 0) {
            errors.push('legalName es obligatorio.');
        }
        if (!app.email || app.email.trim().length === 0) {
            errors.push('email de contacto es obligatorio.');
        }
        if (!approvedBy || approvedBy.trim().length === 0) {
            errors.push('approvedBy es obligatorio.');
        }
        if (errors.length > 0) {
            return { isValid: false, errors };
        }
        const now = (options === null || options === void 0 ? void 0 : options.timestamp) || 1774353600000; // Determinístico o injectado
        const appSlug = cleanSlug(app.appId);
        const bizSlug = cleanSlug(app.businessName);
        const rucSlug = cleanSlug(app.ruc || appSlug);
        const ownerUid = app.ownerUid || `usr_owner_${appSlug}`;
        // Derivación determinística de IDs
        const tenantId = `ten_${bizSlug}_${rucSlug}`;
        const brandId = `br_${bizSlug}`;
        const subscriptionId = `sub_${appSlug}`;
        const legalSlug = cleanSlug(app.legalName || app.businessName);
        const orgId = `org_${legalSlug}`;
        const businessId = `biz_${bizSlug}_${appSlug}`;
        const branchId = `branch_${bizSlug}_matriz`;
        const membershipId = `mem_v3_${appSlug}`;
        const legacyMembershipId = `mem_leg_${appSlug}`;
        const idempotencyKey = `idemp_prov_${app.appId}_${rucSlug}`;
        // Validar que no se inventen tenants default ficticios
        if (tenantId.includes('default') || tenantId.includes('tenant_bluesystem_default')) {
            errors.push("Violación de Seguridad: Generación de tenant default ficticio bloqueada.");
            return { isValid: false, errors };
        }
        const tenant = {
            tenantId,
            displayName: app.businessName,
            legalName: app.legalName,
            ruc: app.ruc,
            subscriptionId,
            status: 'ACTIVE',
            createdAt: now
        };
        const brand = {
            brandId,
            tenantId,
            name: app.businessName,
            status: 'ACTIVE'
        };
        const subscription = {
            subscriptionId,
            tenantId,
            planType: 'STANDARD',
            status: 'ACTIVE',
            validUntil: now + (365 * 24 * 60 * 60 * 1000)
        };
        const organization = {
            orgId,
            tenantId,
            name: app.legalName,
            ownerUid
        };
        const business = {
            businessId,
            tenantId,
            brandId,
            orgId,
            name: app.businessName,
            ownerUid,
            category: app.category || 'RESTAURANT',
            documents: app.documents || []
        };
        const branch = {
            branchId,
            tenantId,
            brandId,
            businessId,
            name: 'Casa Matriz',
            address: app.address || '',
            city: app.city || '',
            isMain: true
        };
        const membershipV3 = {
            membershipId,
            uid: ownerUid,
            tenantId,
            brandId,
            organizationId: orgId,
            businessId,
            branchId,
            role: 'OWNER',
            status: 'ACTIVE',
            permissions: [
                'MANAGE_ORDERS',
                'MANAGE_PRODUCTS',
                'MANAGE_STAFF',
                'VIEW_FINANCE',
                'MANAGE_SETTINGS'
            ],
            createdAt: now,
            updatedAt: now,
            schemaVersion: '3.0'
        };
        const legacyMembership = {
            membershipId: legacyMembershipId,
            uid: ownerUid,
            businessId,
            branchId,
            role: 'OWNER',
            status: 'ACTIVE'
        };
        const userContext = {
            uid: ownerUid,
            email: app.email,
            contactName: app.contactName || app.businessName,
            phone: app.phone || '',
            role: 'MERCHANT_OWNER',
            status: 'ACTIVE'
        };
        const plan = {
            idempotencyKey,
            applicationId: app.appId,
            approvedBy,
            tenant,
            brand,
            subscription,
            organization,
            business,
            branch,
            membershipV3,
            legacyMembership,
            userContext,
            simulation: true,
            createdAt: now
        };
        return { isValid: true, plan };
    }
}
exports.EiamV3ProvisioningPlanner = EiamV3ProvisioningPlanner;
//# sourceMappingURL=provisioningPlanner.js.map