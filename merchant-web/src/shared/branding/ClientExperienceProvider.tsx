/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WEB CLIENT EXPERIENCE PROVIDER (FASE 2D.5)
 * Dynamic Client Experience Context & Hook for React Merchant Web
 * 
 * Provides: brand, tokens, clientExperience, isFallback, updateClientExperience
 */

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { BrandVisualConfig, DesignTokens } from './types';
import { DEFAULT_BRAND_ID, DEFAULT_BRAND_CONFIG } from './defaultBrand';
import { resolveWebDesignTokens, injectCssVariables } from './designTokenResolver';

export interface WebClientExperience {
  tenantId: string;
  brandId: string;
  displayName: string;
  shortName: string;
  commercialModel: string;
  subscriptionPlan: string;
  role: string;
  locale: string;
  currency: string;
  timezone: string;
}

export interface ClientExperienceContextValue {
  brand: {
    brandId: string;
    displayName: string;
    shortName: string;
    visual: BrandVisualConfig;
  };
  tokens: DesignTokens;
  clientExperience: WebClientExperience;
  isFallback: boolean;
  updateExperience: (
    newExperience: Partial<WebClientExperience>,
    visualConfig?: Partial<BrandVisualConfig> | null
  ) => void;
}

const ClientExperienceContext = createContext<ClientExperienceContextValue | null>(null);

const DEFAULT_EXPERIENCE: WebClientExperience = {
  tenantId: 'default_tenant',
  brandId: DEFAULT_BRAND_ID,
  displayName: 'BlueSystem Delivery',
  shortName: 'BlueSystem',
  commercialModel: 'MARKETPLACE',
  subscriptionPlan: 'ENTERPRISE',
  role: 'OWNER',
  locale: 'es_MX',
  currency: 'MXN',
  timezone: 'America/Mexico_City'
};

export const ClientExperienceProvider: React.FC<{
  children: ReactNode;
  initialExperience?: Partial<WebClientExperience>;
  initialVisual?: Partial<BrandVisualConfig> | null;
}> = ({ children, initialExperience, initialVisual }) => {
  const [experience, setExperience] = useState<WebClientExperience>({
    ...DEFAULT_EXPERIENCE,
    ...initialExperience
  });
  const [visual, setVisual] = useState<Partial<BrandVisualConfig> | null>(initialVisual || null);

  const tokens = useMemo(() => {
    return resolveWebDesignTokens(experience.brandId, visual);
  }, [experience.brandId, visual]);

  useEffect(() => {
    injectCssVariables(tokens);
    // Dynamic document title hydration
    if (typeof document !== 'undefined') {
      document.title = `${experience.displayName} — Panel de Control`;
    }
  }, [tokens, experience.displayName]);

  const updateExperience = (
    newExperience: Partial<WebClientExperience>,
    visualConfig?: Partial<BrandVisualConfig> | null
  ) => {
    setExperience(prev => ({
      ...prev,
      ...newExperience,
      brandId: newExperience.brandId || prev.brandId
    }));
    if (visualConfig !== undefined) {
      setVisual(visualConfig);
    }
  };

  const isFallback = experience.brandId === DEFAULT_BRAND_ID && !visual;

  const value = useMemo<ClientExperienceContextValue>(() => ({
    brand: {
      brandId: experience.brandId,
      displayName: experience.displayName,
      shortName: experience.shortName,
      visual: {
        logoUrl: visual?.logoUrl || DEFAULT_BRAND_CONFIG.logoUrl,
        iconUrl: visual?.iconUrl || DEFAULT_BRAND_CONFIG.iconUrl,
        splashUrl: visual?.splashUrl || DEFAULT_BRAND_CONFIG.splashUrl,
        faviconUrl: visual?.faviconUrl || DEFAULT_BRAND_CONFIG.faviconUrl,
        primaryColor: tokens.colors.primary,
        secondaryColor: tokens.colors.secondary,
        accentColor: tokens.colors.accent,
        backgroundColor: tokens.colors.background,
        textColor: tokens.colors.onBackground,
        fontFamily: tokens.typography.fontFamily
      }
    },
    tokens,
    clientExperience: experience,
    isFallback,
    updateExperience
  }), [experience, visual, tokens, isFallback]);

  return (
    <ClientExperienceContext.Provider value={value}>
      {children}
    </ClientExperienceContext.Provider>
  );
};

export const useClientExperience = (): ClientExperienceContextValue => {
  const context = useContext(ClientExperienceContext);
  if (!context) {
    throw new Error('useClientExperience must be used within a ClientExperienceProvider');
  }
  return context;
};
