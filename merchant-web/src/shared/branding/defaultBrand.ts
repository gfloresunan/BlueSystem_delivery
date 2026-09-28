/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — DEFAULT BRAND INVARIANT (FASE 2D.2)
 * Configuración canónica inmutable de BlueSystem Delivery para Backward Compatibility
 */

import { BrandVisualConfig } from './types';

export const DEFAULT_BRAND_ID = 'bluesystem_delivery_default';

export const DEFAULT_BRAND_CONFIG: BrandVisualConfig = Object.freeze({
  logoUrl: '/logo.png',
  iconUrl: '/logo.png',
  splashUrl: '/logo.png',
  faviconUrl: '/favicon.ico',
  primaryColor: '#0284C7',    // Sky-600 BluePrimary
  secondaryColor: '#0EA5E9',  // Sky-500 BlueSecondary
  accentColor: '#38BDF8',     // Sky-400 BlueTertiary
  backgroundColor: '#0F172A', // Slate-900 BgDarkApp
  textColor: '#F8FAFC',       // Slate-50 TextPrimary
  fontFamily: 'Inter, system-ui, sans-serif'
});
