/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.3)
 * Dual-Read Membership Resolver & Legacy Compatibility Engine
 * 
 * Capa de lectura dual estrictamente READ-ONLY (Zero Mutation / Zero Writes).
 * Permite resolver la membresía canónica de un usuario inspeccionando tanto /memberships
 * como /membership sin alterar ninguna fuente de datos.
 */

import {
  MembershipV3Entity,
  LegacyMembershipRecord
} from './models';
import { validateMembershipV3 } from './validators';
import { LegacyMembershipAdapter } from './adapter';

export type DualReadResolutionStatus =
  | 'RESOLVED_V3'
  | 'RESOLVED_LEGACY'
  | 'MIGRATION_PENDING'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'SECURITY_MISMATCH'
  | 'NEVER_RESOLVE';

export interface ConflictDetected {
  membershipId: string;
  uid: string;
  discrepantFields: string[];
  legacyRecord: LegacyMembershipRecord;
  v3Entity: MembershipV3Entity;
}

export interface DualReadResolutionResult {
  status: DualReadResolutionStatus;
  membership: MembershipV3Entity | null;
  source: 'V3' | 'LEGACY' | 'NONE';
  conflict?: ConflictDetected;
  errorDetail?: string;
  readCount: number;
  writeCount: 0; // Garantía de tipo en tiempo de compilación
}

/**
 * Contrato de Fuente de Datos para el Resolver Dual-Read (Solo Lectura)
 */
export interface MembershipDataSourceContract {
  getV3MembershipById(membershipId: string): Promise<MembershipV3Entity | null>;
  getV3MembershipsByUid(uid: string): Promise<MembershipV3Entity[]>;
  getLegacyMembershipById(membershipId: string): Promise<LegacyMembershipRecord | null>;
  getLegacyMembershipsByUid(uid: string): Promise<LegacyMembershipRecord[]>;
  resolveTenantContextForBusiness(businessId: string): Promise<{
    tenantId: string;
    brandId?: string | null;
    organizationId?: string | null;
    isAmbiguous?: boolean;
  } | null>;
}

/**
 * Implementación en Memoria del DataSource para Testing y Staging
 */
export class InMemoryMembershipDataSource implements MembershipDataSourceContract {
  private v3Store = new Map<string, MembershipV3Entity>();
  private legacyStore = new Map<string, LegacyMembershipRecord>();
  private businessTenantMap = new Map<string, {
    tenantId: string;
    brandId?: string | null;
    organizationId?: string | null;
    isAmbiguous?: boolean;
  }>();

  private _readCount = 0;
  private _writeCount = 0;

  get readCount(): number { return this._readCount; }
  get writeCount(): number { return this._writeCount; }

  // Métodos de lectura (incrementan readCount)
  async getV3MembershipById(membershipId: string): Promise<MembershipV3Entity | null> {
    this._readCount++;
    const doc = this.v3Store.get(membershipId);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  async getV3MembershipsByUid(uid: string): Promise<MembershipV3Entity[]> {
    this._readCount++;
    return Array.from(this.v3Store.values())
      .filter(m => m.uid === uid)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  async getLegacyMembershipById(membershipId: string): Promise<LegacyMembershipRecord | null> {
    this._readCount++;
    const doc = this.legacyStore.get(membershipId);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  async getLegacyMembershipsByUid(uid: string): Promise<LegacyMembershipRecord[]> {
    this._readCount++;
    return Array.from(this.legacyStore.values())
      .filter(m => m.uid === uid)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  async resolveTenantContextForBusiness(businessId: string): Promise<{
    tenantId: string;
    brandId?: string | null;
    organizationId?: string | null;
    isAmbiguous?: boolean;
  } | null> {
    this._readCount++;
    const doc = this.businessTenantMap.get(businessId);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  // Helpers de inicialización exclusiva para pruebas (no forman parte del resolver)
  seedV3(membership: MembershipV3Entity): void {
    this.v3Store.set(membership.membershipId, { ...membership });
  }

  seedLegacy(record: LegacyMembershipRecord): void {
    const id = record.membershipId || `mem_leg_${record.uid}_${record.businessId}`;
    this.legacyStore.set(id, { ...record, membershipId: id });
  }

  seedBusinessTenantMapping(
    businessId: string,
    context: { tenantId: string; brandId?: string | null; organizationId?: string | null; isAmbiguous?: boolean }
  ): void {
    this.businessTenantMap.set(businessId, context);
  }

  resetMetrics(): void {
    this._readCount = 0;
    this._writeCount = 0;
  }
}

/**
 * Motor Principal Dual-Read Membership Resolver
 */
export class DualReadMembershipResolver {
  constructor(private dataSource: MembershipDataSourceContract) {}

  /**
   * Resuelve una membresía específica por membershipId con control anti-spoofing de UID
   */
  async resolveByMembershipId(requestedUid: string, membershipId: string): Promise<DualReadResolutionResult> {
    let localReads = 0;

    // 1. Consultar V3
    const v3Doc = await this.dataSource.getV3MembershipById(membershipId);
    localReads++;

    if (v3Doc) {
      // Control de seguridad Anti-Spoofing
      if (v3Doc.uid !== requestedUid) {
        return {
          status: 'SECURITY_MISMATCH',
          membership: null,
          source: 'NONE',
          errorDetail: `Violación de Seguridad: La membresía '${membershipId}' no pertenece al UID solicitado.`,
          readCount: localReads,
          writeCount: 0
        };
      }

      // Validar integridad estructural V3
      const val = validateMembershipV3(v3Doc);
      if (!val.isValid) {
        return {
          status: 'INVALID',
          membership: null,
          source: 'V3',
          errorDetail: `Documento V3 inválido: ${val.errors.join('; ')}`,
          readCount: localReads,
          writeCount: 0
        };
      }

      // Consultar Legacy para verificar posibles conflictos
      const legacyDoc = await this.dataSource.getLegacyMembershipById(membershipId);
      localReads++;

      if (legacyDoc && legacyDoc.uid === requestedUid) {
        const conflict = this.detectConflict(v3Doc, legacyDoc);
        if (conflict) {
          return {
            status: 'AMBIGUOUS',
            membership: null,
            source: 'NONE',
            conflict,
            errorDetail: `Conflicto detectado entre V3 y Legacy en campos: ${conflict.discrepantFields.join(', ')}`,
            readCount: localReads,
            writeCount: 0
          };
        }
      }

      // V3 preferida y válida
      return {
        status: 'RESOLVED_V3',
        membership: v3Doc,
        source: 'V3',
        readCount: localReads,
        writeCount: 0
      };
    }

    // 2. Si no existe V3, consultar Legacy
    const legacyDoc = await this.dataSource.getLegacyMembershipById(membershipId);
    localReads++;

    if (legacyDoc) {
      // Control de seguridad Anti-Spoofing
      if (legacyDoc.uid !== requestedUid) {
        return {
          status: 'SECURITY_MISMATCH',
          membership: null,
          source: 'NONE',
          errorDetail: `Violación de Seguridad: La membresía legacy '${membershipId}' no pertenece al UID solicitado.`,
          readCount: localReads,
          writeCount: 0
        };
      }

      // Resolver contexto del Tenant asociado al businessId
      const tenantContext = await this.dataSource.resolveTenantContextForBusiness(legacyDoc.businessId);
      localReads++;

      // Invariante de seguridad: Prohibido tenant default ficticio
      if (tenantContext?.tenantId) {
        const tid = tenantContext.tenantId.toLowerCase();
        if (tid.includes('default') || tid.includes('tenant_bluesystem_default')) {
          return {
            status: 'NEVER_RESOLVE',
            membership: null,
            source: 'NONE',
            errorDetail: 'Violación de Gobernanza: Intento de resolución a tenant default ficticio bloqueado.',
            readCount: localReads,
            writeCount: 0
          };
        }
      }

      const adaptRes = LegacyMembershipAdapter.transformLegacyToV3(legacyDoc, tenantContext ?? undefined);
      if (adaptRes.resolutionStatus === 'RESOLVED' && adaptRes.entity) {
        return {
          status: 'RESOLVED_LEGACY',
          membership: adaptRes.entity,
          source: 'LEGACY',
          readCount: localReads,
          writeCount: 0
        };
      }

      const mappedStatus: DualReadResolutionStatus =
        adaptRes.resolutionStatus === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'MIGRATION_PENDING';

      return {
        status: mappedStatus,
        membership: null,
        source: 'LEGACY',
        errorDetail: adaptRes.errorDetail,
        readCount: localReads,
        writeCount: 0
      };
    }

    // 3. Ni V3 ni Legacy existen
    return {
      status: 'NOT_FOUND',
      membership: null,
      source: 'NONE',
      readCount: localReads,
      writeCount: 0
    };
  }

  /**
   * Resuelve todas las membresías efectivas de un UID
   */
  async resolveByUid(requestedUid: string): Promise<DualReadResolutionResult[]> {
    const results: DualReadResolutionResult[] = [];

    // 1. Obtener todas las V3
    const v3Docs = await this.dataSource.getV3MembershipsByUid(requestedUid);
    const seenMembershipIds = new Set<string>();

    for (const v3 of v3Docs) {
      seenMembershipIds.add(v3.membershipId);
      const res = await this.resolveByMembershipId(requestedUid, v3.membershipId);
      results.push(res);
    }

    // 2. Obtener todas las Legacy no cubiertas
    const legacyDocs = await this.dataSource.getLegacyMembershipsByUid(requestedUid);
    for (const leg of legacyDocs) {
      const id = leg.membershipId || `mem_${leg.uid}_${leg.businessId}`;
      if (!seenMembershipIds.has(id)) {
        seenMembershipIds.add(id);
        const res = await this.resolveByMembershipId(requestedUid, id);
        results.push(res);
      }
    }

    return results;
  }

  /**
   * Resuelve una membresía específica por UID y TenantId
   */
  async resolveByUidAndTenant(requestedUid: string, targetTenantId: string): Promise<DualReadResolutionResult> {
    if (!targetTenantId || targetTenantId.trim().length === 0) {
      return {
        status: 'INVALID',
        membership: null,
        source: 'NONE',
        errorDetail: 'targetTenantId no puede estar vacío.',
        readCount: 0,
        writeCount: 0
      };
    }

    const allMemberships = await this.resolveByUid(requestedUid);
    const match = allMemberships.find(
      r => r.membership && r.membership.tenantId === targetTenantId
    );

    if (match) {
      return match;
    }

    return {
      status: 'NOT_FOUND',
      membership: null,
      source: 'NONE',
      errorDetail: `No se encontró membresía para el UID en el tenant '${targetTenantId}'.`,
      readCount: allMemberships.reduce((acc, curr) => acc + curr.readCount, 0),
      writeCount: 0
    };
  }

  /**
   * Resuelve la membresía activa principal para login / sesión
   */
  async resolveActiveMembership(requestedUid: string, targetTenantId?: string): Promise<DualReadResolutionResult> {
    if (targetTenantId) {
      const res = await this.resolveByUidAndTenant(requestedUid, targetTenantId);
      if (res.membership && res.membership.status === 'ACTIVE') {
        return res;
      }
      return {
        status: res.status === 'RESOLVED_V3' || res.status === 'RESOLVED_LEGACY' ? 'INVALID' : res.status,
        membership: res.membership,
        source: res.source,
        errorDetail: `La membresía encontrada en el tenant '${targetTenantId}' no se encuentra en estado ACTIVE.`,
        readCount: res.readCount,
        writeCount: 0
      };
    }

    const all = await this.resolveByUid(requestedUid);
    const active = all.find(r => r.membership && r.membership.status === 'ACTIVE');

    if (active) {
      return active;
    }

    if (all.length > 0) {
      // Retornar la primera encontrada aunque no esté ACTIVE (sin convertirla silenciosamente a ACTIVE)
      return all[0];
    }

    return {
      status: 'NOT_FOUND',
      membership: null,
      source: 'NONE',
      readCount: all.reduce((acc, curr) => acc + curr.readCount, 0),
      writeCount: 0
    };
  }

  /**
   * Helper puro para comparar V3 y Legacy detectando discrepancias
   */
  private detectConflict(v3: MembershipV3Entity, leg: LegacyMembershipRecord): ConflictDetected | null {
    const discrepancies: string[] = [];

    // Mapeo canónico del rol legacy para comparar
    const legacyMappedRole = LegacyMembershipAdapter.mapLegacyRole(leg.role);
    if (v3.role !== legacyMappedRole) {
      discrepancies.push(`role (v3: ${v3.role} vs legacy: ${legacyMappedRole})`);
    }

    // Mapeo canónico del status legacy para comparar
    const legacyMappedStatus = LegacyMembershipAdapter.mapLegacyStatus(leg.status);
    if (v3.status !== legacyMappedStatus) {
      discrepancies.push(`status (v3: ${v3.status} vs legacy: ${legacyMappedStatus})`);
    }

    // Comparar businessId si ambos lo definen
    if (leg.businessId && v3.businessId && leg.businessId !== v3.businessId) {
      discrepancies.push(`businessId (v3: ${v3.businessId} vs legacy: ${leg.businessId})`);
    }

    // Comparar branchId si ambos lo definen
    if (leg.branchId && v3.branchId && leg.branchId !== v3.branchId) {
      discrepancies.push(`branchId (v3: ${v3.branchId} vs legacy: ${leg.branchId})`);
    }

    if (discrepancies.length > 0) {
      return {
        membershipId: v3.membershipId,
        uid: v3.uid,
        discrepantFields: discrepancies,
        legacyRecord: leg,
        v3Entity: v3
      };
    }

    return null;
  }
}
