/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WEB BRANDING & DESIGN TOKENS (FASE 2D.2)
 * Contratos de Dominio para Identidad Visual y Tokens en Merchant Web
 */

export interface BrandVisualConfig {
  logoUrl: string;
  iconUrl: string;
  splashUrl: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
}

export interface DesignTokens {
  brandId: string;
  colors: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    accent: string;
    onAccent: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    error: string;
    onError: string;
    success: string;
    onSuccess: string;
    warning: string;
    onWarning: string;
    outline: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    bodyFont: string;
  };
  layout: {
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
      full: string;
    };
  };
  assets: {
    logoUrl: string;
    iconUrl: string;
    splashUrl: string;
    faviconUrl?: string;
  };
}

export interface BrandThemeContextValue {
  tokens: DesignTokens;
  activeBrandId: string;
  isDefaultBrand: boolean;
  updateBrandConfig: (brandId: string, config?: Partial<BrandVisualConfig> | null) => void;
}
