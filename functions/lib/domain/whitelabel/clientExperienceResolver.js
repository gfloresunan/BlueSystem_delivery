"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CLIENT EXPERIENCE RESOLVER (FASE 2D.5 / C2D.5)
 * Master Client Experience Snapshot Generator for Web and Android
 *
 * STRICT ONE CORE / ONE CODEBASE / ZERO FORKS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientExperienceResolver = void 0;
const gatekeeper_1 = require("../gatekeeper/gatekeeper");
const brandHydrationResolver_1 = require("./brandHydrationResolver");
const navigationResolver_1 = require("./navigationResolver");
class ClientExperienceResolver {
    /**
     * Resuelve y sintetiza una instantánea inmutable de Client Experience (`ClientExperienceSnapshot`).
     */
    static resolveSnapshot(tenant, brand, subscription, membership, initialConfig, now = Date.now()) {
        const tenantId = tenant.tenantId || 'tenant_default';
        const commercialModel = tenant.type || 'MARKETPLACE';
        const role = (membership === null || membership === void 0 ? void 0 : membership.role) || 'GUEST';
        // 1. Verificación Cross-Tenant de Marca: Si la marca pertenece a otro tenant, rechazar / aislar
        let safeBrandInput = brand;
        let isCrossTenantBrandMismatch = false;
        if (brand && brand.tenantId && brand.tenantId !== tenantId) {
            isCrossTenantBrandMismatch = true;
            safeBrandInput = null; // Revertir a default brand por seguridad de aislamiento
        }
        // 2. Hidratación de Marca y Design Tokens
        const { brand: hydratedBrand, isFallback } = brandHydrationResolver_1.BrandHydrationResolver.hydrateBrandEntity(safeBrandInput, tenantId);
        const designTokens = brandHydrationResolver_1.BrandHydrationResolver.resolveDesignTokens(hydratedBrand.brandId, hydratedBrand.visual);
        // 3. Verificación Cross-Tenant de Suscripción
        let effectiveSub = subscription;
        if (subscription && subscription.tenantId && subscription.tenantId !== tenantId) {
            effectiveSub = null; // Denegar suscripción de otro tenant
        }
        // 4. Construcción del Gatekeeper Context para evaluación de permisos
        const gateContext = {
            uid: (membership === null || membership === void 0 ? void 0 : membership.uid) || 'guest_user',
            membershipId: (membership === null || membership === void 0 ? void 0 : membership.membershipId) || 'mem_guest',
            tenantId,
            brandId: hydratedBrand.brandId,
            businessId: (membership === null || membership === void 0 ? void 0 : membership.businessId) || null,
            branchId: (membership === null || membership === void 0 ? void 0 : membership.branchId) || null,
            role,
            subscription: effectiveSub || null
        };
        // 5. Resolución de Capacidades Efectivas y Navegación
        const enabledCapabilities = (0, gatekeeper_1.resolveEffectiveCapabilities)(gateContext, now);
        const allNavigation = navigationResolver_1.EntitlementDrivenNavigationResolver.resolveNavigation(gateContext, now, true);
        const visibilityMap = navigationResolver_1.EntitlementDrivenNavigationResolver.resolveModuleVisibility(gateContext, now);
        const enabledModules = [];
        if (effectiveSub && Array.isArray(effectiveSub.enabledFeatures)) {
            for (const feat of effectiveSub.enabledFeatures) {
                if (visibilityMap[feat] === 'VISIBLE') {
                    enabledModules.push(feat);
                }
            }
        }
        // 6. Construcción de Configuración Operacional (Sanitizada, Cero Secretos)
        const locale = (initialConfig === null || initialConfig === void 0 ? void 0 : initialConfig.locale) || 'es_MX';
        const currency = (initialConfig === null || initialConfig === void 0 ? void 0 : initialConfig.currency) || 'MXN';
        const timezone = (initialConfig === null || initialConfig === void 0 ? void 0 : initialConfig.timezone) || 'America/Mexico_City';
        return {
            tenantId,
            brandId: hydratedBrand.brandId,
            organizationId: (membership === null || membership === void 0 ? void 0 : membership.organizationId) || null,
            businessId: (membership === null || membership === void 0 ? void 0 : membership.businessId) || null,
            branchId: (membership === null || membership === void 0 ? void 0 : membership.branchId) || null,
            commercialModel,
            displayName: hydratedBrand.displayName,
            shortName: hydratedBrand.shortName,
            legalName: tenant.legalName || hydratedBrand.displayName,
            visual: hydratedBrand.visual,
            designTokens,
            locale,
            currency,
            timezone,
            subscriptionPlan: (effectiveSub === null || effectiveSub === void 0 ? void 0 : effectiveSub.planTier) || 'STARTER',
            subscriptionStatus: (effectiveSub === null || effectiveSub === void 0 ? void 0 : effectiveSub.status) || 'DRAFT',
            role,
            enabledModules,
            enabledCapabilities,
            navigationItems: allNavigation.filter(n => n.visibility === 'VISIBLE'),
            featureVisibility: visibilityMap,
            isFallback: isFallback || isCrossTenantBrandMismatch,
            timestamp: now
        };
    }
}
exports.ClientExperienceResolver = ClientExperienceResolver;
//# sourceMappingURL=clientExperienceResolver.js.map