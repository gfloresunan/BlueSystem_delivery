/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Pure Custom Claims v3 Builder
 * 
 * Generador determinístico y libre de efectos secundarios para Custom Claims V3.
 * Sin llamadas a Firebase Auth, sin lecturas de base de datos, sin Math.random() ni Date.now().
 */

import {
  ActiveTenantContext,
  CanonicalCustomClaimsV3,
  EiamRole
} from './models';

export class ClaimsV3Builder {

  /**
   * Construye los Claims Canónicos V3 a partir de un ActiveTenantContext
   */
  static buildCanonicalClaims(context: ActiveTenantContext): CanonicalCustomClaimsV3 {
    return {
      role: context.role,
      tenantId: context.tenantId,
      brandId: context.brandId ?? null,
      orgId: context.organizationId ?? null,
      businessId: context.businessId ?? null,
      branchId: context.branchId ?? null,
      status: 'ACTIVE',
      eiamVer: 3
    };
  }

  /**
   * Construye Claims para actores globales de plataforma (SUPER_ADMIN, ADMIN, AUDITOR, SUPPORT)
   */
  static buildPlatformClaims(role: EiamRole): CanonicalCustomClaimsV3 {
    return {
      role,
      tenantId: null,
      brandId: null,
      orgId: null,
      businessId: null,
      branchId: null,
      status: 'ACTIVE',
      eiamVer: 3
    };
  }

  /**
   * Construye Claims globales para cliente consumidor
   */
  static buildGlobalClientClaims(): CanonicalCustomClaimsV3 {
    return {
      role: 'CLIENT',
      tenantId: null,
      brandId: null,
      orgId: null,
      businessId: null,
      branchId: null,
      status: 'ACTIVE',
      eiamVer: 3
    };
  }
}
