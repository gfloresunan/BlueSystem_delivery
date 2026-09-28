/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Contrato de Repositorio y Implementación Aislada en Memoria para Membresías
 * 
 * Totalmente desacoplado de la base de datos de producción (Zero Operational Writes).
 */

import {
  MembershipV3Entity,
  MembershipStatus,
  EiamRole
} from './models';
import {
  validateMembershipV3,
  validateMembershipImmutability
} from './validators';

export interface MembershipRepositoryContract {
  createMembership(membership: MembershipV3Entity): Promise<MembershipV3Entity>;
  getMembershipById(membershipId: string): Promise<MembershipV3Entity | null>;
  getMembershipsByUid(uid: string): Promise<MembershipV3Entity[]>;
  getMembershipByUidAndTenant(uid: string, tenantId: string): Promise<MembershipV3Entity | null>;
  listMembershipsByTenant(tenantId: string): Promise<MembershipV3Entity[]>;
  updateMembership(membershipId: string, updates: Partial<MembershipV3Entity>): Promise<MembershipV3Entity>;
  updateMembershipStatus(membershipId: string, status: MembershipStatus, updatedBy: string, reason?: string): Promise<MembershipV3Entity>;
  updateMembershipRole(membershipId: string, role: EiamRole, updatedBy: string): Promise<MembershipV3Entity>;
}

/**
 * Repositorio de Membresías en Memoria (Testing & Staging Isolation)
 */
export class MembershipRepositoryInMemory implements MembershipRepositoryContract {
  private memberships = new Map<string, MembershipV3Entity>();

  async createMembership(membership: MembershipV3Entity): Promise<MembershipV3Entity> {
    const val = validateMembershipV3(membership);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Membresía inválida: ${val.errors.join('; ')}`);
    }

    if (this.memberships.has(membership.membershipId)) {
      throw new Error(`[DUPLICATE_ID] Ya existe una membresía con ID '${membership.membershipId}'.`);
    }

    // Invariante: Un usuario no puede tener dos membresías activas en el mismo Tenant
    const existingSameTenant = Array.from(this.memberships.values()).find(
      m => m.uid === membership.uid && m.tenantId === membership.tenantId && m.status === 'ACTIVE'
    );
    if (existingSameTenant && membership.status === 'ACTIVE') {
      throw new Error(`[CONFLICT] El usuario '${membership.uid}' ya posee una membresía activa en el tenant '${membership.tenantId}'.`);
    }

    this.memberships.set(membership.membershipId, { ...membership });
    return { ...membership };
  }

  async getMembershipById(membershipId: string): Promise<MembershipV3Entity | null> {
    const doc = this.memberships.get(membershipId);
    return doc ? { ...doc } : null;
  }

  async getMembershipsByUid(uid: string): Promise<MembershipV3Entity[]> {
    return Array.from(this.memberships.values())
      .filter(m => m.uid === uid)
      .map(m => ({ ...m }));
  }

  async getMembershipByUidAndTenant(uid: string, tenantId: string): Promise<MembershipV3Entity | null> {
    const doc = Array.from(this.memberships.values()).find(
      m => m.uid === uid && m.tenantId === tenantId
    );
    return doc ? { ...doc } : null;
  }

  async listMembershipsByTenant(tenantId: string): Promise<MembershipV3Entity[]> {
    return Array.from(this.memberships.values())
      .filter(m => m.tenantId === tenantId)
      .map(m => ({ ...m }));
  }

  async updateMembership(
    membershipId: string,
    updates: Partial<MembershipV3Entity>
  ): Promise<MembershipV3Entity> {
    const existing = await this.getMembershipById(membershipId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Membresía '${membershipId}' no encontrada.`);
    }

    const immutabilityVal = validateMembershipImmutability(existing, updates);
    if (!immutabilityVal.isValid) {
      throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
    }

    const merged: MembershipV3Entity = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    const val = validateMembershipV3(merged);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Actualización de membresía inválida: ${val.errors.join('; ')}`);
    }

    this.memberships.set(membershipId, merged);
    return { ...merged };
  }

  async updateMembershipStatus(
    membershipId: string,
    status: MembershipStatus,
    updatedBy: string,
    reason?: string
  ): Promise<MembershipV3Entity> {
    const existing = await this.getMembershipById(membershipId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Membresía '${membershipId}' no encontrada.`);
    }

    const updates: Partial<MembershipV3Entity> = {
      status,
      updatedAt: Date.now(),
      ...(status === 'REVOKED' ? {
        revokedAt: Date.now(),
        revokedBy: updatedBy,
        revokedReason: reason || 'Revocación administrativa'
      } : {})
    };

    const merged: MembershipV3Entity = {
      ...existing,
      ...updates
    };

    const val = validateMembershipV3(merged);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Actualización de estado inválida: ${val.errors.join('; ')}`);
    }

    this.memberships.set(membershipId, merged);
    return { ...merged };
  }

  async updateMembershipRole(
    membershipId: string,
    role: EiamRole,
    updatedBy: string
  ): Promise<MembershipV3Entity> {
    const existing = await this.getMembershipById(membershipId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Membresía '${membershipId}' no encontrada.`);
    }

    const merged: MembershipV3Entity = {
      ...existing,
      role,
      updatedAt: Date.now()
    };

    const val = validateMembershipV3(merged);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Actualización de rol inválida: ${val.errors.join('; ')}`);
    }

    this.memberships.set(membershipId, merged);
    return { ...merged };
  }

  // Helper de testing para limpiar estado en memoria
  clear(): void {
    this.memberships.clear();
  }
}
