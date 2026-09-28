/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Schemas Canónicos de Membresía e Identidad Multi-Tenant / Multi-Brand
 * 
 * Contratos puros de dominio (Strictly Isolated / Zero Operational Mutation).
 */

export type EiamRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'AUDITOR'
  | 'SUPPORT'
  | 'OWNER'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'CASHIER'
  | 'COOK'
  | 'DRIVER'
  | 'CLIENT'
  | 'GUEST';

export type MembershipStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'PENDING_MIGRATION';

export type LegacyResolutionStatus =
  | 'RESOLVED'
  | 'DERIVABLE'
  | 'AMBIGUOUS'
  | 'UNKNOWN'
  | 'MIGRATION_PENDING';

// ─── 1. ENTIDAD MEMBERSHIP V3 (/memberships/{membershipId}) ───────────────────
export interface MembershipV3Entity {
  membershipId: string;           // Inmutable. Identificador único de la membresía
  uid: string;                    // Inmutable. Firebase Auth UID
  tenantId: string;               // Inmutable. Tenant al que pertenece la membresía
  brandId?: string | null;        // Opcional. Marca específica acotada (null = sin restricción de marca específica)
  organizationId?: string | null; // Opcional. Organización matriz
  businessId?: string | null;     // Opcional. Negocio/Comercio específico
  branchId?: string | null;       // Opcional. Sucursal específica (null = sin restricción de sucursal específica)
  role: EiamRole;                 // Rol canónico EIAM
  status: MembershipStatus;       // Estado de ciclo de vida de la membresía
  permissions: string[];          // Lista de acciones/permisos autorizados (EiamAction[])
  invitedBy?: string;             // UID del emisor de la invitación
  invitedAt?: number;             // Epoch ms
  acceptedAt?: number;            // Epoch ms
  revokedAt?: number;             // Epoch ms
  revokedBy?: string;             // UID del revocador
  revokedReason?: string;         // Motivo de revocación
  createdAt: number;              // Timestamp epoch ms. Inmutable.
  updatedAt: number;              // Timestamp epoch ms
  schemaVersion: '3.0';           // Versión de contrato ("3.0")
}

// ─── 2. CONTRATO DE CUSTOM CLAIMS V3 (JWT Payload) ────────────────────────────
export interface CanonicalCustomClaimsV3 {
  role: EiamRole;                 // Rol activo normalizado
  tenantId: string | null;        // UUID del Tenant activo (null para Platform Admin o Client global)
  brandId: string | null;         // UUID de Brand activa
  orgId: string | null;           // UUID de Organización matriz
  businessId: string | null;      // UUID del Negocio activo
  branchId: string | null;        // UUID de la Sucursal activa
  status: 'ACTIVE';               // Estado del contexto activo ("ACTIVE")
  eiamVer: 3;                     // Versión fija del contrato de claims (3)
}

// ─── 3. CONTEXTO ACTIVO DE TENANT (ActiveTenantContext) ─────────────────────────
export interface ActiveTenantContext {
  tenantId: string;               // UUID del Tenant activo
  brandId: string | null;         // UUID de Brand activa (o null)
  organizationId: string | null;  // UUID de Org activa (o null)
  businessId: string | null;      // UUID de Negocio activo (o null)
  branchId: string | null;        // UUID de Sucursal activa (o null)
  role: EiamRole;                 // Rol de la membresía activa
  membershipId: string;           // ID de la membresía que otorga este contexto
  status: MembershipStatus;       // Estado de la membresía activa
}

// ─── 4. ESTRUCTURA LEGACY Y RESOLUCIÓN (/membership Legacy) ───────────────────
export interface LegacyMembershipRecord {
  membershipId?: string;
  uid: string;
  businessId: string;
  orgId?: string | null;
  branchId?: string | null;
  role: string;
  status?: string;
  permissions?: string[];
  invitedBy?: string;
  invitedAt?: any;
  acceptedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface MembershipResolutionResult {
  resolutionStatus: LegacyResolutionStatus;
  entity: MembershipV3Entity | null;
  errorDetail?: string;
}
