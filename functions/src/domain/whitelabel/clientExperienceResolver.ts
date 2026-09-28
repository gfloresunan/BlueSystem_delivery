/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CLIENT EXPERIENCE RESOLVER (FASE 2D.5 / C2D.5)
 * Master Client Experience Snapshot Generator for Web and Android
 * 
 * STRICT ONE CORE / ONE CODEBASE / ZERO FORKS
 */

import {
  TenantEntity,
  BrandEntity,
  SubscriptionEntity,
  CommercialModel,
  CapabilityModule
} from '../platform/models';
import { MembershipV3Entity, EiamRole } from '../identity/models';
import { GatekeeperContext } from '../gatekeeper/models';
import { resolveEffectiveCapabilities } from '../gatekeeper/gatekeeper';
import { BrandHydrationResolver } from './brandHydrationResolver';
import { EntitlementDrivenNavigationResolver } from './navigationResolver';
import {
  ClientExperienceSnapshot,
  ModuleVisibilityState
} from './models';
import { InitialTenantConfiguration } from '../provisioning/models';

export class ClientExperienceResolver {
  /**
   * Resuelve y sintetiza una instantánea inmutable de Client Experience (`ClientExperienceSnapshot`).
   */
  static resolveSnapshot(
    tenant: Partial<TenantEntity>,
    brand: Partial<BrandEntity> | null,
    subscription: Partial<SubscriptionEntity> | null,
    membership: Partial<MembershipV3Entity> | null,
    initialConfig?: Partial<InitialTenantConfiguration> | null,
    now: number = Date.now()
  ): ClientExperienceSnapshot {
    const tenantId = tenant.tenantId || 'tenant_default';
    const commercialModel: CommercialModel = tenant.type || 'MARKETPLACE';
    const role: EiamRole = membership?.role || 'GUEST';

    // 1. Verificación Cross-Tenant de Marca: Si la marca pertenece a otro tenant, rechazar / aislar
    let safeBrandInput = brand;
    let isCrossTenantBrandMismatch = false;
    if (brand && brand.tenantId && brand.tenantId !== tenantId) {
      isCrossTenantBrandMismatch = true;
      safeBrandInput = null; // Revertir a default brand por seguridad de aislamiento
    }

    // 2. Hidratación de Marca y Design Tokens
    const { brand: hydratedBrand, isFallback } = BrandHydrationResolver.hydrateBrandEntity(
      safeBrandInput,
      tenantId
    );
    const designTokens = BrandHydrationResolver.resolveDesignTokens(
      hydratedBrand.brandId,
      hydratedBrand.visual
    );

    // 3. Verificación Cross-Tenant de Suscripción
    let effectiveSub = subscription;
    if (subscription && subscription.tenantId && subscription.tenantId !== tenantId) {
      effectiveSub = null; // Denegar suscripción de otro tenant
    }

    // 4. Construcción del Gatekeeper Context para evaluación de permisos
    const gateContext: GatekeeperContext = {
      uid: membership?.uid || 'guest_user',
      membershipId: membership?.membershipId || 'mem_guest',
      tenantId,
      brandId: hydratedBrand.brandId,
      businessId: membership?.businessId || null,
      branchId: membership?.branchId || null,
      role,
      subscription: effectiveSub || null
    };

    // 5. Resolución de Capacidades Efectivas y Navegación
    const enabledCapabilities = resolveEffectiveCapabilities(gateContext, now);
    const allNavigation = EntitlementDrivenNavigationResolver.resolveNavigation(gateContext, now, true);
    const visibilityMap = EntitlementDrivenNavigationResolver.resolveModuleVisibility(gateContext, now);

    const enabledModules: CapabilityModule[] = [];
    if (effectiveSub && Array.isArray(effectiveSub.enabledFeatures)) {
      for (const feat of effectiveSub.enabledFeatures) {
        if (visibilityMap[feat] === 'VISIBLE') {
          enabledModules.push(feat);
        }
      }
    }

    // 6. Construcción de Configuración Operacional (Sanitizada, Cero Secretos)
    const locale = initialConfig?.locale || 'es_MX';
    const currency = initialConfig?.currency || 'MXN';
    const timezone = initialConfig?.timezone || 'America/Mexico_City';

    return {
      tenantId,
      brandId: hydratedBrand.brandId,
      organizationId: membership?.organizationId || null,
      businessId: membership?.businessId || null,
      branchId: membership?.branchId || null,
      commercialModel,
      displayName: hydratedBrand.displayName,
      shortName: hydratedBrand.shortName,
      legalName: tenant.legalName || hydratedBrand.displayName,
      visual: hydratedBrand.visual,
      designTokens,
      locale,
      currency,
      timezone,
      subscriptionPlan: effectiveSub?.planTier || 'STARTER',
      subscriptionStatus: effectiveSub?.status || 'DRAFT',
      role,
      enabledModules,
      enabledCapabilities,
      navigationItems: allNavigation.filter(n => n.visibility === 'VISIBLE'),
      featureVisibility: visibilityMap,
      isFallback: isFallback || isCrossTenantBrandMismatch,
      timestamp: now
    };
  }
}
