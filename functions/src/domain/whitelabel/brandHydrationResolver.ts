/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — BRAND HYDRATION RESOLVER (FASE 2D.5 / C2D.5)
 * Pure Deterministic Brand Hydration, Token Synthesis & Fallback Engine
 * 
 * STRICT INVARIANT: Safe fallback to DEFAULT_BRAND_CONFIG on null, empty or corrupt data.
 */

import {
  BrandEntity,
  BrandVisualConfig,
  DesignTokens,
  DEFAULT_BRAND_CONFIG
} from '../platform/models';
import { isDarkHex, getContrastText } from '../tokens/designTokenResolver';

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export class BrandHydrationResolver {
  /**
   * Valida o sanea un color HEX, utilizando el fallback canónico si es inválido.
   */
  static sanitizeHexColor(hex: string | undefined | null, fallback: string): string {
    if (!hex || typeof hex !== 'string' || !HEX_REGEX.test(hex)) {
      return fallback;
    }
    return hex;
  }

  /**
   * Hidrata y sanea una configuración visual de marca (`BrandVisualConfig`).
   * Garantiza que ningún campo sea nulo o inválido, aplicando fallbacks atómicos.
   */
  static hydrateVisualConfig(config?: Partial<BrandVisualConfig> | null): {
    visual: BrandVisualConfig;
    isFallback: boolean;
  } {
    if (!config || typeof config !== 'object') {
      return {
        visual: { ...DEFAULT_BRAND_CONFIG },
        isFallback: true
      };
    }

    const hasCustomPrimary = !!config.primaryColor && HEX_REGEX.test(config.primaryColor);
    const hasCustomLogo = !!config.logoUrl && config.logoUrl.trim().length > 0;

    const visual: BrandVisualConfig = {
      logoUrl: config.logoUrl && config.logoUrl.trim().length > 0 ? config.logoUrl : DEFAULT_BRAND_CONFIG.logoUrl,
      iconUrl: config.iconUrl && config.iconUrl.trim().length > 0 ? config.iconUrl : DEFAULT_BRAND_CONFIG.iconUrl,
      splashUrl: config.splashUrl && config.splashUrl.trim().length > 0 ? config.splashUrl : DEFAULT_BRAND_CONFIG.splashUrl,
      faviconUrl: config.faviconUrl && config.faviconUrl.trim().length > 0 ? config.faviconUrl : DEFAULT_BRAND_CONFIG.faviconUrl,
      primaryColor: this.sanitizeHexColor(config.primaryColor, DEFAULT_BRAND_CONFIG.primaryColor),
      secondaryColor: this.sanitizeHexColor(config.secondaryColor, DEFAULT_BRAND_CONFIG.secondaryColor),
      accentColor: this.sanitizeHexColor(config.accentColor, DEFAULT_BRAND_CONFIG.accentColor),
      backgroundColor: this.sanitizeHexColor(config.backgroundColor, DEFAULT_BRAND_CONFIG.backgroundColor),
      textColor: this.sanitizeHexColor(config.textColor, DEFAULT_BRAND_CONFIG.textColor),
      fontFamily: config.fontFamily && config.fontFamily.trim().length > 0 ? config.fontFamily : DEFAULT_BRAND_CONFIG.fontFamily
    };

    const isFallback = !hasCustomPrimary && !hasCustomLogo;

    return { visual, isFallback };
  }

  /**
   * Resuelve y sintetiza DesignTokens completos para Web y Android a partir de BrandVisualConfig.
   */
  static resolveDesignTokens(brandId: string, visualConfig: BrandVisualConfig): DesignTokens {
    const primary = visualConfig.primaryColor;
    const secondary = visualConfig.secondaryColor;
    const accent = visualConfig.accentColor;
    const background = visualConfig.backgroundColor;
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
  static hydrateBrandEntity(brand?: Partial<BrandEntity> | null, defaultTenantId: string = 'default_tenant'): {
    brand: BrandEntity;
    isFallback: boolean;
  } {
    if (!brand || !brand.brandId) {
      const { visual } = this.hydrateVisualConfig(null);
      const fallbackBrand: BrandEntity = {
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

    const hydratedBrand: BrandEntity = {
      brandId: brand.brandId,
      tenantId: brand.tenantId || defaultTenantId,
      displayName: brand.displayName || 'BlueSystem Delivery',
      shortName: brand.shortName || 'BlueSystem',
      slug: brand.slug || 'brand-default',
      visual,
      metadata: {
        supportEmail: brand.metadata?.supportEmail || 'support@bluesystem.io',
        supportPhone: brand.metadata?.supportPhone || '+1234567890',
        website: brand.metadata?.website
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
