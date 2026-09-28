/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WEB DESIGN TOKEN RESOLVER (FASE 2D.2)
 * Síntesis de Design Tokens y CSS Custom Properties para Merchant Web
 */

import { BrandVisualConfig, DesignTokens } from './types';
import { DEFAULT_BRAND_CONFIG, DEFAULT_BRAND_ID } from './defaultBrand';

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isDarkHex(hex: string): boolean {
  if (!HEX_REGEX.test(hex)) return true;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

export function getContrastText(backgroundHex: string): string {
  return isDarkHex(backgroundHex) ? '#FFFFFF' : '#0F172A';
}

function sanitizeHex(hex: string | undefined | null, fallback: string): string {
  if (!hex || typeof hex !== 'string' || !HEX_REGEX.test(hex)) {
    return fallback;
  }
  return hex;
}

export function resolveWebDesignTokens(
  brandId: string = DEFAULT_BRAND_ID,
  config?: Partial<BrandVisualConfig> | null
): DesignTokens {
  const effectiveConfig: BrandVisualConfig = {
    logoUrl: config?.logoUrl || DEFAULT_BRAND_CONFIG.logoUrl,
    iconUrl: config?.iconUrl || DEFAULT_BRAND_CONFIG.iconUrl,
    splashUrl: config?.splashUrl || DEFAULT_BRAND_CONFIG.splashUrl,
    faviconUrl: config?.faviconUrl || DEFAULT_BRAND_CONFIG.faviconUrl,
    primaryColor: sanitizeHex(config?.primaryColor, DEFAULT_BRAND_CONFIG.primaryColor),
    secondaryColor: sanitizeHex(config?.secondaryColor, DEFAULT_BRAND_CONFIG.secondaryColor),
    accentColor: sanitizeHex(config?.accentColor, DEFAULT_BRAND_CONFIG.accentColor),
    backgroundColor: sanitizeHex(config?.backgroundColor, DEFAULT_BRAND_CONFIG.backgroundColor),
    textColor: sanitizeHex(config?.textColor, DEFAULT_BRAND_CONFIG.textColor),
    fontFamily: config?.fontFamily || DEFAULT_BRAND_CONFIG.fontFamily
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
      bodyFont: effectiveConfig.fontFamily || 'Inter, system-ui, sans-serif'
    },
    layout: {
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px'
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

export function injectCssVariables(tokens: DesignTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', tokens.colors.primary);
  root.style.setProperty('--brand-on-primary', tokens.colors.onPrimary);
  root.style.setProperty('--brand-primary-container', tokens.colors.primaryContainer);
  root.style.setProperty('--brand-on-primary-container', tokens.colors.onPrimaryContainer);
  root.style.setProperty('--brand-secondary', tokens.colors.secondary);
  root.style.setProperty('--brand-on-secondary', tokens.colors.onSecondary);
  root.style.setProperty('--brand-accent', tokens.colors.accent);
  root.style.setProperty('--brand-on-accent', tokens.colors.onAccent);
  root.style.setProperty('--brand-bg', tokens.colors.background);
  root.style.setProperty('--brand-on-bg', tokens.colors.onBackground);
  root.style.setProperty('--brand-surface', tokens.colors.surface);
  root.style.setProperty('--brand-on-surface', tokens.colors.onSurface);
  root.style.setProperty('--brand-surface-variant', tokens.colors.surfaceVariant);
  root.style.setProperty('--brand-outline', tokens.colors.outline);
  root.style.setProperty('--brand-font-family', tokens.typography.fontFamily);
}
