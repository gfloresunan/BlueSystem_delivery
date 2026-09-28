"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2D.2)
 * Pure Design Token Resolver: Transforma BrandVisualConfig en Tokens Normalizados
 *
 * Invariante: Fallback seguro a DEFAULT_BRAND_CONFIG si la configuración es nula o corrupta.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDarkHex = isDarkHex;
exports.getContrastText = getContrastText;
exports.resolveDesignTokens = resolveDesignTokens;
exports.generateCssVariables = generateCssVariables;
const models_1 = require("../platform/models");
const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
/**
 * Calcula si un color HEX es oscuro para determinar el texto de contraste.
 */
function isDarkHex(hex) {
    if (!HEX_REGEX.test(hex))
        return true;
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    // Fórmula estándar de luminancia relativa (YIQ)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
}
/**
 * Obtiene color de contraste adecuado (#FFFFFF o #0F172A).
 */
function getContrastText(backgroundHex) {
    return isDarkHex(backgroundHex) ? '#FFFFFF' : '#0F172A';
}
/**
 * Valida o reemplaza con un color por defecto seguro.
 */
function sanitizeHex(hex, fallback) {
    if (!hex || typeof hex !== 'string' || !HEX_REGEX.test(hex)) {
        return fallback;
    }
    return hex;
}
/**
 * Resuelve y sintetiza DesignTokens completos a partir de BrandVisualConfig.
 */
function resolveDesignTokens(brandId = 'default_bluesystem', config) {
    const effectiveConfig = {
        logoUrl: (config === null || config === void 0 ? void 0 : config.logoUrl) || models_1.DEFAULT_BRAND_CONFIG.logoUrl,
        iconUrl: (config === null || config === void 0 ? void 0 : config.iconUrl) || models_1.DEFAULT_BRAND_CONFIG.iconUrl,
        splashUrl: (config === null || config === void 0 ? void 0 : config.splashUrl) || models_1.DEFAULT_BRAND_CONFIG.splashUrl,
        faviconUrl: (config === null || config === void 0 ? void 0 : config.faviconUrl) || models_1.DEFAULT_BRAND_CONFIG.faviconUrl,
        primaryColor: sanitizeHex(config === null || config === void 0 ? void 0 : config.primaryColor, models_1.DEFAULT_BRAND_CONFIG.primaryColor),
        secondaryColor: sanitizeHex(config === null || config === void 0 ? void 0 : config.secondaryColor, models_1.DEFAULT_BRAND_CONFIG.secondaryColor),
        accentColor: sanitizeHex(config === null || config === void 0 ? void 0 : config.accentColor, models_1.DEFAULT_BRAND_CONFIG.accentColor),
        backgroundColor: sanitizeHex(config === null || config === void 0 ? void 0 : config.backgroundColor, models_1.DEFAULT_BRAND_CONFIG.backgroundColor),
        textColor: sanitizeHex(config === null || config === void 0 ? void 0 : config.textColor, models_1.DEFAULT_BRAND_CONFIG.textColor),
        fontFamily: (config === null || config === void 0 ? void 0 : config.fontFamily) || models_1.DEFAULT_BRAND_CONFIG.fontFamily
    };
    const primary = effectiveConfig.primaryColor;
    const secondary = effectiveConfig.secondaryColor;
    const accent = effectiveConfig.accentColor;
    const background = effectiveConfig.backgroundColor;
    const surface = isDarkHex(background) ? '#1E293B' : '#FFFFFF';
    const surfaceVariant = isDarkHex(background) ? '#334155' : '#F1F5F9';
    return {
        brandId,
        colors: {
            primary,
            onPrimary: getContrastText(primary),
            primaryContainer: isDarkHex(primary) ? '#0369A1' : '#E0F2FE',
            onPrimaryContainer: isDarkHex(primary) ? '#E0F2FE' : '#0369A1',
            secondary,
            onSecondary: getContrastText(secondary),
            accent,
            onAccent: getContrastText(accent),
            background,
            onBackground: getContrastText(background),
            surface,
            onSurface: getContrastText(surface),
            surfaceVariant,
            onSurfaceVariant: getContrastText(surfaceVariant),
            error: '#EF4444',
            onError: '#FFFFFF',
            success: '#10B981',
            onSuccess: '#FFFFFF',
            warning: '#F59E0B',
            onWarning: '#0F172A',
            outline: isDarkHex(background) ? '#475569' : '#CBD5E1'
        },
        typography: {
            fontFamily: effectiveConfig.fontFamily || 'Inter, system-ui, sans-serif',
            headingFont: effectiveConfig.fontFamily || 'Inter, system-ui, sans-serif',
            bodyFont: effectiveConfig.fontFamily || 'Inter, system-ui, sans-serif',
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
            logoUrl: effectiveConfig.logoUrl,
            iconUrl: effectiveConfig.iconUrl,
            splashUrl: effectiveConfig.splashUrl,
            faviconUrl: effectiveConfig.faviconUrl
        }
    };
}
/**
 * Convierte DesignTokens a un mapa de variables CSS para inyección en el DOM Web.
 */
function generateCssVariables(tokens) {
    return {
        '--brand-primary': tokens.colors.primary,
        '--brand-on-primary': tokens.colors.onPrimary,
        '--brand-primary-container': tokens.colors.primaryContainer,
        '--brand-on-primary-container': tokens.colors.onPrimaryContainer,
        '--brand-secondary': tokens.colors.secondary,
        '--brand-on-secondary': tokens.colors.onSecondary,
        '--brand-accent': tokens.colors.accent,
        '--brand-on-accent': tokens.colors.onAccent,
        '--brand-bg': tokens.colors.background,
        '--brand-on-bg': tokens.colors.onBackground,
        '--brand-surface': tokens.colors.surface,
        '--brand-on-surface': tokens.colors.onSurface,
        '--brand-surface-variant': tokens.colors.surfaceVariant,
        '--brand-outline': tokens.colors.outline,
        '--brand-font-family': tokens.typography.fontFamily,
        '--brand-radius-sm': tokens.layout.borderRadius.sm,
        '--brand-radius-md': tokens.layout.borderRadius.md,
        '--brand-radius-lg': tokens.layout.borderRadius.lg
    };
}
//# sourceMappingURL=designTokenResolver.js.map