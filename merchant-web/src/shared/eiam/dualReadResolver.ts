/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 WEB INTEGRATION (FASE 2C.8)
 * Dual-Read Membership Resolver para Web (Read-Only / Zero Mutation).
 */

import {
  WebActiveTenantContext,
  WebMembershipOption,
  WebResolutionStatus
} from './models';

export interface WebDualReadResult {
  status: WebResolutionStatus;
  context: WebActiveTenantContext | null;
  availableMemberships: WebMembershipOption[];
  error?: string;
}

export interface WebMembershipDataSource {
  getV3MembershipsByUid(uid: string): Promise<any[]>;
  getLegacyMembershipsByUid(uid: string): Promise<any[]>;
  resolveBusinessTenantMapping(businessId: string): Promise<{ tenantId?: string; brandId?: string; organizationId?: string; isAmbiguous?: boolean } | null>;
}

function normalizeRole(rawRole: string | undefined): string {
  if (!rawRole) return 'OWNER';
  const str = String(rawRole).toLowerCase().trim();
  if (['owner', 'business', 'comercio', 'merchant', 'propietario', 'business_owner', 'merchant_owner'].includes(str)) {
    return 'OWNER';
  }
  if (['manager', 'gerente'].includes(str)) return 'MANAGER';
  if (['supervisor'].includes(str)) return 'SUPERVISOR';
  if (['cashier', 'cajero', 'caja', 'seller'].includes(str)) return 'CASHIER';
  if (['cook', 'cocinero', 'cocina', 'kitchen'].includes(str)) return 'COOK';
  return str.toUpperCase();
}

/**
 * Resolver Dual-Read Puro para Web
 */
export class WebDualReadMembershipResolver {
  private dataSource: WebMembershipDataSource;

  constructor(dataSource: WebMembershipDataSource) {
    this.dataSource = dataSource;
  }

  async resolveForUser(callerUid: string, preferredMembershipId?: string): Promise<WebDualReadResult> {
    if (!callerUid || callerUid.trim().length === 0) {
      return {
        status: 'UNINITIALIZED',
        context: null,
        availableMemberships: [],
        error: 'UID de usuario no autenticado.'
      };
    }

    try {
      // 1. Consultar V3
      const v3Memberships = await this.dataSource.getV3MembershipsByUid(callerUid);
      // 2. Consultar Legacy
      const legacyMemberships = await this.dataSource.getLegacyMembershipsByUid(callerUid);

      const availableOptions: WebMembershipOption[] = [];

      // Procesar V3
      for (const m of v3Memberships) {
        if (m.uid === callerUid && m.status === 'ACTIVE' && m.tenantId) {
          availableOptions.push({
            membershipId: m.membershipId,
            tenantId: m.tenantId,
            brandId: m.brandId || null,
            businessId: m.businessId || null,
            branchId: m.branchId || null,
            role: m.role || 'MEMBER',
            source: 'V3',
            label: `${m.tenantId} - ${m.role}`
          });
        }
      }

      // Procesar Legacy
      for (const leg of legacyMemberships) {
        if (leg.uid === callerUid && leg.status === 'ACTIVE') {
          const mapping = await this.dataSource.resolveBusinessTenantMapping(leg.businessId);
          const resolvedTenantId = leg.tenantId || mapping?.tenantId || leg.orgId || mapping?.organizationId;
          if (resolvedTenantId && (!mapping || !mapping.isAmbiguous)) {
            // Comprobar que no esté duplicado en V3
            const existsInV3 = availableOptions.some(o => o.businessId === leg.businessId && o.tenantId === resolvedTenantId);
            if (!existsInV3) {
              const memId = leg.membershipId || `mem_leg_${leg.uid}_${leg.businessId}`;
              const normalizedRole = normalizeRole(leg.role);
              availableOptions.push({
                membershipId: memId,
                tenantId: resolvedTenantId,
                brandId: mapping?.brandId || leg.brandId || null,
                businessId: leg.businessId || null,
                branchId: leg.branchId || null,
                role: normalizedRole,
                source: 'LEGACY',
                label: `${resolvedTenantId} (${leg.businessId}) - ${normalizedRole}`
              });
            }
          }
        }
      }

      if (availableOptions.length === 0) {
        if (legacyMemberships.length > 0) {
          return {
            status: 'LEGACY_ONLY',
            context: null,
            availableMemberships: [],
            error: 'Membresías legacy sin mapeo directo de Tenant.'
          };
        }
        return {
          status: 'NOT_FOUND',
          context: null,
          availableMemberships: [],
          error: 'No se encontraron membresías activas para el usuario.'
        };
      }

      // Seleccionar membresía objetivo
      let selected = availableOptions[0];
      if (preferredMembershipId) {
        const found = availableOptions.find(o => o.membershipId === preferredMembershipId);
        if (found) selected = found;
      }

      const activeContext: WebActiveTenantContext = {
        membershipId: selected.membershipId,
        tenantId: selected.tenantId,
        brandId: selected.brandId,
        organizationId: (selected as any).organizationId || null,
        businessId: selected.businessId,
        branchId: selected.branchId,
        role: selected.role,
        status: 'ACTIVE'
      };

      const finalStatus: WebResolutionStatus = selected.source === 'V3' ? 'RESOLVED_V3' : 'RESOLVED_LEGACY';

      return {
        status: finalStatus,
        context: activeContext,
        availableMemberships: availableOptions
      };

    } catch (err: any) {
      return {
        status: 'ERROR',
        context: null,
        availableMemberships: [],
        error: err.message || 'Error en resolución Dual-Read.'
      };
    }
  }
}
