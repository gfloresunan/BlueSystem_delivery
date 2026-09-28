"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ENTITLEMENT-DRIVEN NAVIGATION RESOLVER (FASE 2D.5 / C2D.5)
 * Dynamic Navigation & Module Visibility Resolver based on Role ∩ Subscription ∩ Entitlements ∩ Tenant Context
 *
 * ══════════════════════════════════════════════════════════════════════════════════
 * CRITICAL ARCHITECTURAL PRINCIPLE: UI VISIBILITY ≠ SECURITY AUTHORIZATION
 * Hiding a menu item improves UX, but Gatekeeper remains the sole authorization gate.
 * ══════════════════════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementDrivenNavigationResolver = exports.CANONICAL_NAVIGATION_CATALOG = void 0;
const gatekeeper_1 = require("../gatekeeper/gatekeeper");
const catalog_1 = require("../gatekeeper/catalog");
exports.CANONICAL_NAVIGATION_CATALOG = Object.freeze([
    {
        id: 'nav_orders',
        label: 'Pedidos',
        path: '/orders',
        iconName: 'ReceiptLong',
        requiredModule: 'ORDERS',
        order: 1
    },
    {
        id: 'nav_catalog',
        label: 'Catálogo',
        path: '/catalog',
        iconName: 'MenuBook',
        requiredModule: 'CATALOG',
        order: 2
    },
    {
        id: 'nav_customers',
        label: 'Clientes',
        path: '/customers',
        iconName: 'People',
        requiredModule: 'CUSTOMERS',
        order: 3
    },
    {
        id: 'nav_promotions',
        label: 'Promociones',
        path: '/promotions',
        iconName: 'LocalOffer',
        requiredModule: 'PROMOTIONS',
        order: 4
    },
    {
        id: 'nav_finance',
        label: 'Finanzas y Caja',
        path: '/finance',
        iconName: 'AccountBalanceWallet',
        requiredModule: 'FINANCE',
        order: 5
    },
    {
        id: 'nav_reports',
        label: 'Reportes',
        path: '/reports',
        iconName: 'BarChart',
        requiredModule: 'REPORTS',
        order: 6
    },
    {
        id: 'nav_control_tower',
        label: 'Torre de Control',
        path: '/control-tower',
        iconName: 'Radar',
        requiredModule: 'CONTROL_TOWER',
        order: 7
    },
    {
        id: 'nav_fleet',
        label: 'Flota de Reparto',
        path: '/fleet',
        iconName: 'TwoWheeler',
        requiredModule: 'FLEET_CORE',
        order: 8
    },
    {
        id: 'nav_kds',
        label: 'Cocina KDS',
        path: '/kds',
        iconName: 'SoupKitchen',
        requiredModule: 'ORDERS', // KDS se asocia a flujo operativo de órdenes/KDS
        requiredCapability: 'ORDERS:UPDATE_KDS_STATUS',
        order: 9
    },
    {
        id: 'nav_analytics',
        label: 'Business Intelligence',
        path: '/analytics',
        iconName: 'Insights',
        requiredModule: 'ANALYTICS',
        order: 10
    },
    {
        id: 'nav_multi_branch',
        label: 'Sucursales',
        path: '/branches',
        iconName: 'Store',
        requiredModule: 'MULTI_BRANCH',
        order: 11
    },
    {
        id: 'nav_multi_brand',
        label: 'Marcas',
        path: '/brands',
        iconName: 'BrandingWatermark',
        requiredModule: 'MULTI_BRAND',
        order: 12
    },
    {
        id: 'nav_governance',
        label: 'Gobernanza y Auditoría',
        path: '/governance',
        iconName: 'Security',
        requiredModule: 'GOVERNANCE',
        order: 13
    },
    {
        id: 'nav_api_access',
        label: 'Desarrolladores & API',
        path: '/developer-api',
        iconName: 'Code',
        requiredModule: 'API_ACCESS',
        order: 14
    }
]);
class EntitlementDrivenNavigationResolver {
    /**
     * Resuelve la visibilidad de cada módulo del catálogo para el contexto dado.
     */
    static resolveModuleVisibility(context, now = Date.now()) {
        const visibilityMap = {};
        for (const modKey of Object.keys(catalog_1.MODULE_CATALOG)) {
            const decision = (0, gatekeeper_1.canAccessModule)(context, modKey, now);
            if (decision.allowed) {
                visibilityMap[modKey] = 'VISIBLE';
            }
            else {
                switch (decision.reason) {
                    case 'SUBSCRIPTION_EXPIRED':
                    case 'SUBSCRIPTION_INACTIVE':
                        visibilityMap[modKey] = 'DISABLED';
                        break;
                    case 'ROLE_UNAUTHORIZED':
                        visibilityMap[modKey] = 'DENIED';
                        break;
                    case 'ENTITLEMENT_MISSING':
                    case 'SUBSCRIPTION_MISSING':
                    case 'TENANT_MISMATCH':
                    default:
                        visibilityMap[modKey] = 'HIDDEN';
                        break;
                }
            }
        }
        return visibilityMap;
    }
    /**
     * Resuelve los elementos de navegación para Merchant Web y Android.
     * Filtra elementos ocultos y ordena según la prioridad canónica.
     */
    static resolveNavigation(context, now = Date.now(), includeNonVisible = false) {
        const visibilityMap = this.resolveModuleVisibility(context, now);
        const resolvedItems = exports.CANONICAL_NAVIGATION_CATALOG.map(item => {
            let visibility = visibilityMap[item.requiredModule] || 'HIDDEN';
            // Si tiene una capacidad requerida específica, validar rol
            if (visibility === 'VISIBLE' && item.requiredCapability) {
                const modDef = catalog_1.MODULE_CATALOG[item.requiredModule];
                const roleCaps = (modDef === null || modDef === void 0 ? void 0 : modDef.roleCapabilities[context.role.toUpperCase()]) || [];
                const action = item.requiredCapability.split(':')[1];
                if (action && !roleCaps.includes(action)) {
                    visibility = 'DENIED';
                }
            }
            return Object.assign(Object.assign({}, item), { visibility });
        });
        if (includeNonVisible) {
            return resolvedItems.sort((a, b) => a.order - b.order);
        }
        // Por defecto retorna solo los elementos VISIBLE
        return resolvedItems
            .filter(item => item.visibility === 'VISIBLE')
            .sort((a, b) => a.order - b.order);
    }
}
exports.EntitlementDrivenNavigationResolver = EntitlementDrivenNavigationResolver;
//# sourceMappingURL=navigationResolver.js.map