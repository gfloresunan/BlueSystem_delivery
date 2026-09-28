/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Adaptador Puro de Compatibilidad para Membresías Legacy
 * 
 * Transforma contratos legacy /membership a MembershipV3Entity sin inventar tenants ficticios.
 * Regla de Oro: Prohibido 'tenant_bluesystem_default'.
 */

import {
  MembershipV3Entity,
  LegacyMembershipRecord,
  MembershipResolutionResult,
  EiamRole,
  MembershipStatus
} from './models';
import { validateMembershipV3 } from './validators';

export class LegacyMembershipAdapter {

  /**
   * Mapea un string de rol legacy a EiamRole canónico
   */
  static mapLegacyRole(rawRole: string | undefined): EiamRole {
    if (!rawRole) return 'CLIENT';
    const str = rawRole.toLowerCase().trim();

    const roleMap: Record<string, EiamRole> = {
      // Plataforma
      super_admin: 'SUPER_ADMIN',
      superadmin: 'SUPER_ADMIN',
      admin: 'ADMIN',
      auditor: 'AUDITOR',
      support: 'SUPPORT',
      soporte: 'SUPPORT',

      // Comercio
      owner: 'OWNER',
      merchant_owner: 'OWNER',
      business_owner: 'OWNER',
      business: 'OWNER',
      comercio: 'OWNER',
      merchant: 'OWNER',
      manager: 'MANAGER',
      gerente: 'MANAGER',
      supervisor: 'SUPERVISOR',
      cashier: 'CASHIER',
      cajero: 'CASHIER',
      cook: 'COOK',
      cocinero: 'COOK',

      // Reparto / Cliente
      driver: 'DRIVER',
      motorizado: 'DRIVER',
      courier: 'DRIVER',
      client: 'CLIENT',
      customer: 'CLIENT',
      cliente: 'CLIENT',
      guest: 'GUEST'
    };

    return roleMap[str] || 'CLIENT';
  }

  /**
   * Mapea un status legacy a MembershipStatus canónico
   */
  static mapLegacyStatus(rawStatus: string | undefined): MembershipStatus {
    if (!rawStatus) return 'ACTIVE';
    const str = rawStatus.toUpperCase().trim();

    switch (str) {
      case 'ACTIVE':
      case 'ACTIVO':
        return 'ACTIVE';
      case 'PENDING':
      case 'PENDIENTE':
        return 'INVITED';
      case 'SUSPENDED':
      case 'SUSPENDIDO':
      case 'BLOCKED':
      case 'BLOQUEADO':
        return 'SUSPENDED';
      case 'REVOKED':
      case 'REVOCADO':
      case 'TERMINATED':
        return 'REVOKED';
      case 'EXPIRED':
      case 'EXPIRADO':
        return 'EXPIRED';
      default:
        return 'PENDING_MIGRATION';
    }
  }

  /**
   * Convierte un registro de membresía Legacy a MembershipV3Entity.
   * Si no se provee un tenantId resoluble, retorna MIGRATION_PENDING o UNKNOWN (Fail-Closed).
   */
  static transformLegacyToV3(
    legacy: LegacyMembershipRecord,
    resolvedTenantContext?: { tenantId: string; brandId?: string | null; organizationId?: string | null; isAmbiguous?: boolean }
  ): MembershipResolutionResult {
    // 1. Detección de ambigüedad
    if (resolvedTenantContext?.isAmbiguous) {
      return {
        resolutionStatus: 'AMBIGUOUS',
        entity: null,
        errorDetail: `El negocio legacy '${legacy.businessId}' posee conflictos de titularidad entre múltiples tenants.`
      };
    }

    // 2. Si no hay tenantId resoluble, marcar como MIGRATION_PENDING (Nunca inventar tenant)
    if (!resolvedTenantContext || !resolvedTenantContext.tenantId || resolvedTenantContext.tenantId.trim().length === 0) {
      return {
        resolutionStatus: legacy.businessId ? 'MIGRATION_PENDING' : 'UNKNOWN',
        entity: null,
        errorDetail: legacy.businessId
          ? `El negocio legacy '${legacy.businessId}' no tiene un tenantId asociado aún.`
          : `Registro de membresía huérfano sin businessId ni tenantId.`
      };
    }

    const tenantId = resolvedTenantContext.tenantId.trim();
    // Invariante de seguridad: Prohibido tenant default ficticio
    if (tenantId.toLowerCase().includes('default') || tenantId.toLowerCase().includes('tenant_bluesystem_default')) {
      return {
        resolutionStatus: 'MIGRATION_PENDING',
        entity: null,
        errorDetail: 'Violación de Gobernanza: Intento de resolución a tenant default ficticio bloqueado.'
      };
    }

    const now = Date.now();
    const membershipId = legacy.membershipId || `mem_${legacy.uid}_${resolvedTenantContext.tenantId}`;
    const role = this.mapLegacyRole(legacy.role);
    const status = this.mapLegacyStatus(legacy.status);
    const permissions = Array.isArray(legacy.permissions) ? legacy.permissions : [];

    const entity: MembershipV3Entity = {
      membershipId,
      uid: legacy.uid,
      tenantId,
      brandId: resolvedTenantContext.brandId ?? null,
      organizationId: resolvedTenantContext.organizationId ?? legacy.orgId ?? null,
      businessId: legacy.businessId || null,
      branchId: legacy.branchId || null,
      role,
      status,
      permissions,
      invitedBy: legacy.invitedBy,
      createdAt: typeof legacy.createdAt === 'number' ? legacy.createdAt : now,
      updatedAt: now,
      schemaVersion: '3.0'
    };

    const val = validateMembershipV3(entity);
    if (!val.isValid) {
      return {
        resolutionStatus: 'MIGRATION_PENDING',
        entity: null,
        errorDetail: `Fallo de validación V3 al transformar: ${val.errors.join('; ')}`
      };
    }

    return {
      resolutionStatus: 'RESOLVED',
      entity
    };
  }
}
