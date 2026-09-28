/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — BRAND THEME PROVIDER (FASE 2D.2)
 * Proveedor de Contexto Dinámico de Marca y Tokens de Diseño para Merchant Web
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { BrandVisualConfig, DesignTokens, BrandThemeContextValue } from './types';
import { DEFAULT_BRAND_ID, DEFAULT_BRAND_CONFIG } from './defaultBrand';
import { resolveWebDesignTokens, injectCssVariables } from './designTokenResolver';

const BrandThemeContext = createContext<BrandThemeContextValue | null>(null);

interface BrandThemeProviderProps {
  children: ReactNode;
  initialBrandId?: string;
  initialBrandConfig?: Partial<BrandVisualConfig> | null;
}

export const BrandThemeProvider: React.FC<BrandThemeProviderProps> = ({
  children,
  initialBrandId = DEFAULT_BRAND_ID,
  initialBrandConfig = null
}) => {
  const [activeBrandId, setActiveBrandId] = useState<string>(initialBrandId);
  const [brandConfig, setBrandConfig] = useState<Partial<BrandVisualConfig> | null>(initialBrandConfig);

  const tokens: DesignTokens = useMemo(() => {
    try {
      return resolveWebDesignTokens(activeBrandId, brandConfig);
    } catch (err) {
      console.warn('[BrandThemeProvider] Error resolviendo tokens, aplicando DEFAULT_BRAND_CONFIG fallback', err);
      return resolveWebDesignTokens(DEFAULT_BRAND_ID, DEFAULT_BRAND_CONFIG);
    }
  }, [activeBrandId, brandConfig]);

  useEffect(() => {
    injectCssVariables(tokens);
  }, [tokens]);

  const updateBrandConfig = (newBrandId: string, newConfig?: Partial<BrandVisualConfig> | null) => {
    setActiveBrandId(newBrandId || DEFAULT_BRAND_ID);
    setBrandConfig(newConfig || null);
  };

  const isDefaultBrand = activeBrandId === DEFAULT_BRAND_ID || !brandConfig;

  const value = useMemo<BrandThemeContextValue>(() => ({
    tokens,
    activeBrandId,
    isDefaultBrand,
    updateBrandConfig
  }), [tokens, activeBrandId, isDefaultBrand]);

  return (
    <BrandThemeContext.Provider value={value}>
      {children}
    </BrandThemeContext.Provider>
  );
};

export const useBrandTheme = (): BrandThemeContextValue => {
  const context = useContext(BrandThemeContext);
  if (!context) {
    // Fallback seguro en caso de uso fuera del Provider (Backward Compatibility Invariant)
    const fallbackTokens = resolveWebDesignTokens(DEFAULT_BRAND_ID, DEFAULT_BRAND_CONFIG);
    return {
      tokens: fallbackTokens,
      activeBrandId: DEFAULT_BRAND_ID,
      isDefaultBrand: true,
      updateBrandConfig: () => {}
    };
  }
  return context;
};
