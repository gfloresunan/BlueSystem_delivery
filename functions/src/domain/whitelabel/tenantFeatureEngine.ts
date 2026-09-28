/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TENANT FEATURE ENGINE (FASE 2E)
 * Subscription Plan Capabilities & White-Label Domain Feature Gating
 */

import {
  PlanTier,
  TenantFeatureConfig,
  DomainType
} from '../platform/models';

export class TenantFeatureEngine {
  /**
   * Resuelve la configuración de capacidades permitidas según el nivel de suscripción.
   */
  static resolveFeaturesForTier(tier: PlanTier): TenantFeatureConfig {
    switch (tier) {
      case 'STARTER':
        return {
          customDomainAllowed: false,
          customSubdomainAllowed: false,
          customBrandingAllowed: false,
          customEmailPrepared: false,
          advancedControlTower: false,
          advancedReports: false,
          maxCustomDomains: 0
        };

      case 'PROFESSIONAL':
        return {
          customDomainAllowed: false,
          customSubdomainAllowed: true,
          customBrandingAllowed: true,
          customEmailPrepared: false,
          advancedControlTower: true,
          advancedReports: true,
          maxCustomDomains: 1
        };

      case 'ENTERPRISE':
      case 'CUSTOM':
      default:
        return {
          customDomainAllowed: true,
          customSubdomainAllowed: true,
          customBrandingAllowed: true,
          customEmailPrepared: true,
          advancedControlTower: true,
          advancedReports: true,
          maxCustomDomains: 10
        };
    }
  }

  /**
   * Valida si un tipo de dominio está permitido para el plan actual de un tenant.
   */
  static isDomainTypeAllowed(tier: PlanTier, domainType: DomainType): { allowed: boolean; reason?: string } {
    const features = this.resolveFeaturesForTier(tier);

    if (domainType === 'PLATFORM') {
      return { allowed: true };
    }

    if (domainType === 'TENANT_SUBDOMAIN') {
      if (!features.customSubdomainAllowed) {
        return {
          allowed: false,
          reason: `El plan ${tier} no permite subdominios personalizados. Requiere plan PROFESSIONAL o superior.`
        };
      }
      return { allowed: true };
    }

    if (domainType === 'CUSTOM_DOMAIN') {
      if (!features.customDomainAllowed) {
        return {
          allowed: false,
          reason: `El plan ${tier} no permite dominios propios personalizados. Requiere plan ENTERPRISE.`
        };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Tipo de dominio no reconocido.' };
  }
}
