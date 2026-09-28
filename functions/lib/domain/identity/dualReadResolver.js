"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.3)
 * Dual-Read Membership Resolver & Legacy Compatibility Engine
 *
 * Capa de lectura dual estrictamente READ-ONLY (Zero Mutation / Zero Writes).
 * Permite resolver la membresía canónica de un usuario inspeccionando tanto /memberships
 * como /membership sin alterar ninguna fuente de datos.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualReadMembershipResolver = exports.InMemoryMembershipDataSource = void 0;
const validators_1 = require("./validators");
const adapter_1 = require("./adapter");
/**
 * Implementación en Memoria del DataSource para Testing y Staging
 */
class InMemoryMembershipDataSource {
    constructor() {
        this.v3Store = new Map();
        this.legacyStore = new Map();
        this.businessTenantMap = new Map();
        this._readCount = 0;
        this._writeCount = 0;
    }
    get readCount() { return this._readCount; }
    get writeCount() { return this._writeCount; }
    // Métodos de lectura (incrementan readCount)
    async getV3MembershipById(membershipId) {
        this._readCount++;
        const doc = this.v3Store.get(membershipId);
        return doc ? JSON.parse(JSON.stringify(doc)) : null;
    }
    async getV3MembershipsByUid(uid) {
        this._readCount++;
        return Array.from(this.v3Store.values())
            .filter(m => m.uid === uid)
            .map(m => JSON.parse(JSON.stringify(m)));
    }
    async getLegacyMembershipById(membershipId) {
        this._readCount++;
        const doc = this.legacyStore.get(membershipId);
        return doc ? JSON.parse(JSON.stringify(doc)) : null;
    }
    async getLegacyMembershipsByUid(uid) {
        this._readCount++;
        return Array.from(this.legacyStore.values())
            .filter(m => m.uid === uid)
            .map(m => JSON.parse(JSON.stringify(m)));
    }
    async resolveTenantContextForBusiness(businessId) {
        this._readCount++;
        const doc = this.businessTenantMap.get(businessId);
        return doc ? JSON.parse(JSON.stringify(doc)) : null;
    }
    // Helpers de inicialización exclusiva para pruebas (no forman parte del resolver)
    seedV3(membership) {
        this.v3Store.set(membership.membershipId, Object.assign({}, membership));
    }
    seedLegacy(record) {
        const id = record.membershipId || `mem_leg_${record.uid}_${record.businessId}`;
        this.legacyStore.set(id, Object.assign(Object.assign({}, record), { membershipId: id }));
    }
    seedBusinessTenantMapping(businessId, context) {
        this.businessTenantMap.set(businessId, context);
    }
    resetMetrics() {
        this._readCount = 0;
        this._writeCount = 0;
    }
}
exports.InMemoryMembershipDataSource = InMemoryMembershipDataSource;
/**
 * Motor Principal Dual-Read Membership Resolver
 */
class DualReadMembershipResolver {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Resuelve una membresía específica por membershipId con control anti-spoofing de UID
     */
    async resolveByMembershipId(requestedUid, membershipId) {
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
            const val = (0, validators_1.validateMembershipV3)(v3Doc);
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
            if (tenantContext === null || tenantContext === void 0 ? void 0 : tenantContext.tenantId) {
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
            const adaptRes = adapter_1.LegacyMembershipAdapter.transformLegacyToV3(legacyDoc, tenantContext !== null && tenantContext !== void 0 ? tenantContext : undefined);
            if (adaptRes.resolutionStatus === 'RESOLVED' && adaptRes.entity) {
                return {
                    status: 'RESOLVED_LEGACY',
                    membership: adaptRes.entity,
                    source: 'LEGACY',
                    readCount: localReads,
                    writeCount: 0
                };
            }
            const mappedStatus = adaptRes.resolutionStatus === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'MIGRATION_PENDING';
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
    async resolveByUid(requestedUid) {
        const results = [];
        // 1. Obtener todas las V3
        const v3Docs = await this.dataSource.getV3MembershipsByUid(requestedUid);
        const seenMembershipIds = new Set();
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
    async resolveByUidAndTenant(requestedUid, targetTenantId) {
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
        const match = allMemberships.find(r => r.membership && r.membership.tenantId === targetTenantId);
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
    async resolveActiveMembership(requestedUid, targetTenantId) {
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
    detectConflict(v3, leg) {
        const discrepancies = [];
        // Mapeo canónico del rol legacy para comparar
        const legacyMappedRole = adapter_1.LegacyMembershipAdapter.mapLegacyRole(leg.role);
        if (v3.role !== legacyMappedRole) {
            discrepancies.push(`role (v3: ${v3.role} vs legacy: ${legacyMappedRole})`);
        }
        // Mapeo canónico del status legacy para comparar
        const legacyMappedStatus = adapter_1.LegacyMembershipAdapter.mapLegacyStatus(leg.status);
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
exports.DualReadMembershipResolver = DualReadMembershipResolver;
//# sourceMappingURL=dualReadResolver.js.map