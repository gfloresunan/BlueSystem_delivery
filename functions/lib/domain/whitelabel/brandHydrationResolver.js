"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — BRAND HYDRATION RESOLVER (FASE 2D.5 / C2D.5)
 * Pure Deterministic Brand Hydration, Token Synthesis & Fallback Engine
 *
 * STRICT INVARIANT: Safe fallback to DEFAULT_BRAND_CONFIG on null, empty or corrupt data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandHydrationResolver = void 0;
const models_1 = require("../platform/models");
const designTokenResolver_1 = require("../tokens/designTokenResolver");
const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
class BrandHydrationResolver {
    /**
     * Valida o sanea un color HEX, utilizando el fallback canónico si es inválido.
     */
    static sanitizeHexColor(hex, fallback) {
        if (!hex || typeof hex !== 'string' || !HEX_REGEX.test(hex)) {
            return fallback;
        }
        return hex;
    }
    /**
     * Hidrata y sanea una configuración visual de marca (`BrandVisualConfig`).
     * Garantiza que ningún campo sea nulo o inválido, aplicando fallbacks atómicos.
     */
    static hydrateVisualConfig(config) {
        if (!config || typeof config !== 'object') {
            return {
                visual: Object.assign({}, models_1.DEFAULT_BRAND_CONFIG),
                isFallback: true
            };
        }
        const hasCustomPrimary = !!config.primaryColor && HEX_REGEX.test(config.primaryColor);
        const hasCustomLogo = !!config.logoUrl && config.logoUrl.trim().length > 0;
        const visual = {
            logoUrl: config.logoUrl && config.logoUrl.trim().length > 0 ? config.logoUrl : models_1.DEFAULT_BRAND_CONFIG.logoUrl,
            iconUrl: config.iconUrl && config.iconUrl.trim().length > 0 ? config.iconUrl : models_1.DEFAULT_BRAND_CONFIG.iconUrl,
            splashUrl: config.splashUrl && config.splashUrl.trim().length > 0 ? config.splashUrl : models_1.DEFAULT_BRAND_CONFIG.splashUrl,
            faviconUrl: config.faviconUrl && config.faviconUrl.trim().length > 0 ? config.faviconUrl : models_1.DEFAULT_BRAND_CONFIG.faviconUrl,
            primaryColor: this.sanitizeHexColor(config.primaryColor, models_1.DEFAULT_BRAND_CONFIG.primaryColor),
            secondaryColor: this.sanitizeHexColor(config.secondaryColor, models_1.DEFAULT_BRAND_CONFIG.secondaryColor),
            accentColor: this.sanitizeHexColor(config.accentColor, models_1.DEFAULT_BRAND_CONFIG.accentColor),
            backgroundColor: this.sanitizeHexColor(config.backgroundColor, models_1.DEFAULT_BRAND_CONFIG.backgroundColor),
            textColor: this.sanitizeHexColor(config.textColor, models_1.DEFAULT_BRAND_CONFIG.textColor),
            fontFamily: config.fontFamily && config.fontFamily.trim().length > 0 ? config.fontFamily : models_1.DEFAULT_BRAND_CONFIG.fontFamily
        };
        const isFallback = !hasCustomPrimary && !hasCustomLogo;
        return { visual, isFallback };
    }
    /**
     * Resuelve y sintetiza DesignTokens completos para Web y Android a partir de BrandVisualConfig.
     */
    static resolveDesignTokens(brandId, visualConfig) {
        const primary = visualConfig.primaryColor;
        const secondary = visualConfig.secondaryColor;
        const accent = visualConfig.accentColor;
        const background = visualConfig.backgroundColor;
        const surface = (0, designTokenResolver_1.isDarkHex)(background) ? '#1E293B' : '#FFFFFF';
        const surfaceVariant = (0, designTokenResolver_1.isDarkHex)(background) ? '#334155' : '#F1F5F9';
        return {
            brandId,
            colors: {
                primary,
                onPrimary: (0, designTokenResolver_1.getContrastText)(primary),
                primaryContainer: (0, designTokenResolver_1.isDarkHex)(primary) ? '#0369A1' : '#E0F2FE',
                onPrimaryContainer: (0, designTokenResolver_1.isDarkHex)(primary) ? '#E0F2FE' : '#0369A1',
                secondary,
                onSecondary: (0, designTokenResolver_1.getContrastText)(secondary),
                accent,
                onAccent: (0, designTokenResolver_1.getContrastText)(accent),
                background,
                onBackground: (0, designTokenResolver_1.getContrastText)(background),
                surface,
                onSurface: (0, designTokenResolver_1.getContrastText)(surface),
                surfaceVariant,
                onSurfaceVariant: (0, designTokenResolver_1.getContrastText)(surfaceVariant),
                error: '#EF4444',
                onError: '#FFFFFF',
                success: '#10B981',
                onSuccess: '#FFFFFF',
                warning: '#F59E0B',
                onWarning: '#0F172A',
                outline: (0, designTokenResolver_1.isDarkHex)(background) ? '#475569' : '#CBD5E1'
            },
            typography: {
                fontFamily: visualConfig.fontFamily || 'Inter, system-ui, sans-serif',
                headingFont: visualConfig.fontFamily || 'Inter, system-ui, sans-serif',
                bodyFont: visualConfig.fontFamily || 'Inter, system-ui, sans-serif',
                scale: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    h3: '1.5rem',
                    h2: '1.875rem',
                    h1: '2.25rem'
                }
            },
            layout: {
                borderRadius: {
                    none: '0px',
                    sm: '4px',
                    md: '8px',
                    lg: '16px',
                    full: '9999px'
                },
                spacing: {
                    xs: '4px',
                    sm: '8px',
                    md: '16px',
                    lg: '24px',
                    xl: '32px'
                }
            },
            assets: {
                logoUrl: visualConfig.logoUrl,
                iconUrl: visualConfig.iconUrl,
                splashUrl: visualConfig.splashUrl,
                faviconUrl: visualConfig.faviconUrl
            }
        };
    }
    /**
     * Hidrata una entidad completa de Marca (`BrandEntity`).
     */
    static hydrateBrandEntity(brand, defaultTenantId = 'default_tenant') {
        var _a, _b, _c;
        if (!brand || !brand.brandId) {
            const { visual } = this.hydrateVisualConfig(null);
            const fallbackBrand = {
                brandId: 'default_bluesystem_brand',
                tenantId: defaultTenantId,
                displayName: 'BlueSystem Delivery',
                shortName: 'BlueSystem',
                slug: 'bluesystem-delivery',
                visual,
                metadata: {
                    supportEmail: 'support@bluesystem.io',
                    supportPhone: '+1234567890'
                },
                status: 'ACTIVE',
                schemaVersion: '1.0',
                createdAt: 1700000000000,
                updatedAt: 1700000000000,
                createdBy: 'system',
                updatedBy: 'system'
            };
            return { brand: fallbackBrand, isFallback: true };
        }
        const { visual, isFallback: isVisualFallback } = this.hydrateVisualConfig(brand.visual);
        const hydratedBrand = {
            brandId: brand.brandId,
            tenantId: brand.tenantId || defaultTenantId,
            displayName: brand.displayName || 'BlueSystem Delivery',
            shortName: brand.shortName || 'BlueSystem',
            slug: brand.slug || 'brand-default',
            visual,
            metadata: {
                supportEmail: ((_a = brand.metadata) === null || _a === void 0 ? void 0 : _a.supportEmail) || 'support@bluesystem.io',
                supportPhone: ((_b = brand.metadata) === null || _b === void 0 ? void 0 : _b.supportPhone) || '+1234567890',
                website: (_c = brand.metadata) === null || _c === void 0 ? void 0 : _c.website
            },
            status: brand.status || 'ACTIVE',
            schemaVersion: '1.0',
            createdAt: brand.createdAt || Date.now(),
            updatedAt: brand.updatedAt || Date.now(),
            createdBy: brand.createdBy || 'system',
            updatedBy: brand.updatedBy || 'system'
        };
        return { brand: hydratedBrand, isFallback: isVisualFallback };
    }
}
exports.BrandHydrationResolver = BrandHydrationResolver;
//# sourceMappingURL=brandHydrationResolver.js.map