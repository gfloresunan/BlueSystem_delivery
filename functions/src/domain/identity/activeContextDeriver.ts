/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Active Context Derivation Engine
 * 
 * Capa pura para derivar el ActiveTenantContext a partir de una membresía resuelta.
 * Regla de Oro: Solo RESOLVED_V3 y RESOLVED_LEGACY con status 'ACTIVE' producen contexto activo (Fail-Closed).
 */

import {
  ActiveTenantContext,
  MembershipV3Entity
} from './models';
import { DualReadResolutionResult } from './dualReadResolver';

export interface ActiveContextDerivationResult {
  success: boolean;
  context: ActiveTenantContext | null;
  errorDetail?: string;
}

export class ActiveContextDeriver {

  /**
   * Deriva el ActiveTenantContext a partir del resultado del Dual-Read Resolver
   */
  static deriveFromResolutionResult(res: DualReadResolutionResult): ActiveContextDerivationResult {
    // 1. Validar estado de resolución
    if (res.status !== 'RESOLVED_V3' && res.status !== 'RESOLVED_LEGACY') {
      return {
        success: false,
        context: null,
        errorDetail: `No se puede derivar contexto activo para estado de resolución '${res.status}'. Motivo: ${res.errorDetail || 'Membresía no resuelta'}.`
      };
    }

    // 2. Validar presencia de entidad
    if (!res.membership) {
      return {
        success: false,
        context: null,
        errorDetail: 'La resolución indica éxito pero el objeto de membresía es nulo.'
      };
    }

    return this.deriveFromMembershipEntity(res.membership);
  }

  /**
   * Deriva el ActiveTenantContext a partir de una entidad de Membresía V3
   */
  static deriveFromMembershipEntity(membership: MembershipV3Entity): ActiveContextDerivationResult {
    // 3. Validar estado de ciclo de vida (Solo ACTIVE es elegible)
    if (membership.status !== 'ACTIVE') {
      return {
        success: false,
        context: null,
        errorDetail: `La membresía '${membership.membershipId}' está en estado '${membership.status}' (se requiere 'ACTIVE').`
      };
    }

    // 4. Validar tenantId (No puede ser vacío ni ficticio)
    if (!membership.tenantId || membership.tenantId.trim().length === 0) {
      return {
        success: false,
        context: null,
        errorDetail: `La membresía '${membership.membershipId}' no posee un tenantId válido.`
      };
    }

    const tidLower = membership.tenantId.toLowerCase();
    if (tidLower.includes('default') || tidLower.includes('tenant_bluesystem_default')) {
      return {
        success: false,
        context: null,
        errorDetail: 'Violación de Seguridad: Intento de derivar contexto activo sobre tenant default ficticio bloqueado.'
      };
    }

    // 5. Construcción del Contexto Activo Canónico
    const context: ActiveTenantContext = {
      tenantId: membership.tenantId,
      brandId: membership.brandId ?? null,
      organizationId: membership.organizationId ?? null,
      businessId: membership.businessId ?? null,
      branchId: membership.branchId ?? null,
      role: membership.role,
      membershipId: membership.membershipId,
      status: 'ACTIVE'
    };

    return {
      success: true,
      context
    };
  }
}
