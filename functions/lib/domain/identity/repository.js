"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Contrato de Repositorio y Implementación Aislada en Memoria para Membresías
 *
 * Totalmente desacoplado de la base de datos de producción (Zero Operational Writes).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipRepositoryInMemory = void 0;
const validators_1 = require("./validators");
/**
 * Repositorio de Membresías en Memoria (Testing & Staging Isolation)
 */
class MembershipRepositoryInMemory {
    constructor() {
        this.memberships = new Map();
    }
    async createMembership(membership) {
        const val = (0, validators_1.validateMembershipV3)(membership);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Membresía inválida: ${val.errors.join('; ')}`);
        }
        if (this.memberships.has(membership.membershipId)) {
            throw new Error(`[DUPLICATE_ID] Ya existe una membresía con ID '${membership.membershipId}'.`);
        }
        // Invariante: Un usuario no puede tener dos membresías activas en el mismo Tenant
        const existingSameTenant = Array.from(this.memberships.values()).find(m => m.uid === membership.uid && m.tenantId === membership.tenantId && m.status === 'ACTIVE');
        if (existingSameTenant && membership.status === 'ACTIVE') {
            throw new Error(`[CONFLICT] El usuario '${membership.uid}' ya posee una membresía activa en el tenant '${membership.tenantId}'.`);
        }
        this.memberships.set(membership.membershipId, Object.assign({}, membership));
        return Object.assign({}, membership);
    }
    async getMembershipById(membershipId) {
        const doc = this.memberships.get(membershipId);
        return doc ? Object.assign({}, doc) : null;
    }
    async getMembershipsByUid(uid) {
        return Array.from(this.memberships.values())
            .filter(m => m.uid === uid)
            .map(m => (Object.assign({}, m)));
    }
    async getMembershipByUidAndTenant(uid, tenantId) {
        const doc = Array.from(this.memberships.values()).find(m => m.uid === uid && m.tenantId === tenantId);
        return doc ? Object.assign({}, doc) : null;
    }
    async listMembershipsByTenant(tenantId) {
        return Array.from(this.memberships.values())
            .filter(m => m.tenantId === tenantId)
            .map(m => (Object.assign({}, m)));
    }
    async updateMembership(membershipId, updates) {
        const existing = await this.getMembershipById(membershipId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Membresía '${membershipId}' no encontrada.`);
        }
        const immutabilityVal = (0, validators_1.validateMembershipImmutability)(existing, updates);
        if (!immutabilityVal.isValid) {
            throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
        }
        const merged = Object.assign(Object.assign(Object.assign({}, existing), updates), { updatedAt: Date.now() });
        const val = (0, validators_1.validateMembershipV3)(merged);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Actualización de membresía inválida: ${val.errors.join('; ')}`);
        }
        this.memberships.set(membershipId, merged);
        return Object.assign({}, merged);
    }
    async updateMembershipStatus(membershipId, status, updatedBy, reason) {
        const existing = await this.getMembershipById(membershipId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Membresía '${membershipId}' no encontrada.`);
        }
        const updates = Object.assign({ status, updatedAt: Date.now() }, (status === 'REVOKED' ? {
            revokedAt: Date.now(),
            revokedBy: updatedBy,
            revokedReason: reason || 'Revocación administrativa'
        } : {}));
        const merged = Object.assign(Object.assign({}, existing), updates);
        const val = (0, validators_1.validateMembershipV3)(merged);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Actualización de estado inválida: ${val.errors.join('; ')}`);
        }
        this.memberships.set(membershipId, merged);
        return Object.assign({}, merged);
    }
    async updateMembershipRole(membershipId, role, updatedBy) {
        const existing = await this.getMembershipById(membershipId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Membresía '${membershipId}' no encontrada.`);
        }
        const merged = Object.assign(Object.assign({}, existing), { role, updatedAt: Date.now() });
        const val = (0, validators_1.validateMembershipV3)(merged);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Actualización de rol inválida: ${val.errors.join('; ')}`);
        }
        this.memberships.set(membershipId, merged);
        return Object.assign({}, merged);
    }
    // Helper de testing para limpiar estado en memoria
    clear() {
        this.memberships.clear();
    }
}
exports.MembershipRepositoryInMemory = MembershipRepositoryInMemory;
//# sourceMappingURL=repository.js.map