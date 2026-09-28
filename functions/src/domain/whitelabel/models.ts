/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — WHITE-LABEL DYNAMIC CLIENT EXPERIENCE (FASE 2D.5 / C2D.5)
 * Canonical Models, Client Experience Snapshots, Navigation Contracts & Visibility Types
 * 
 * STRICTLY ISOLATED DOMAIN CONTRACTS (One Core / One Codebase / Zero Forks)
 */

import {
  CommercialModel,
  SubscriptionStatus,
  PlanTier,
  CapabilityModule,
  BrandVisualConfig,
  DesignTokens,
  DEFAULT_BRAND_CONFIG
} from '../platform/models';
import { EiamRole } from '../identity/models';

// ─── 1. VISIBILITY STATE ─────────────────────────────────────────────────────
export type ModuleVisibilityState = 
  | 'VISIBLE'
  | 'HIDDEN'
  | 'DISABLED'
  | 'DENIED';

// ─── 2. NAVIGATION ITEM CONFIGURATION ────────────────────────────────────────
export interface NavigationItemConfig {
  id: string;
  label: string;
  path: string;
  iconName: string;
  requiredModule: CapabilityModule;
  requiredCapability?: string;
  order: number;
  visibility: ModuleVisibilityState;
}

// ─── 3. CLIENT EXPERIENCE CONFIGURATION ──────────────────────────────────────
export interface ClientExperienceConfig {
  tenantId: string;
  brandId: string;
  organizationId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  commercialModel: CommercialModel;
  displayName: string;
  shortName: string;
  legalName?: string;
  visual: BrandVisualConfig;
  locale: string;
  currency: string;
  timezone: string;
  subscriptionPlan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  role: EiamRole;
}

// ─── 4. CLIENT EXPERIENCE SNAPSHOT (DETERMINISTIC & SERIALIZABLE) ────────────
export interface ClientExperienceSnapshot {
  tenantId: string;
  brandId: string;
  organizationId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  commercialModel: CommercialModel;
  displayName: string;
  shortName: string;
  legalName?: string;
  visual: BrandVisualConfig;
  designTokens: DesignTokens;
  locale: string;
  currency: string;
  timezone: string;
  subscriptionPlan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  role: EiamRole;
  enabledModules: CapabilityModule[];
  enabledCapabilities: string[];
  navigationItems: NavigationItemConfig[];
  featureVisibility: Record<string, ModuleVisibilityState>;
  isFallback: boolean;
  timestamp: number;
}
