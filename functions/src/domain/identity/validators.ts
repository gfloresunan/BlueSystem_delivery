/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Validadores Puros de Dominio para Membresía e Identidad Multi-Tenant
 * 
 * Reglas estrictas de validación, inmutabilidad y Fail-Closed.
 */

import {
  MembershipV3Entity,
  CanonicalCustomClaimsV3,
  ActiveTenantContext,
  EiamRole,
  MembershipStatus
} from './models';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const VALID_EIAM_ROLES: EiamRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'AUDITOR',
  'SUPPORT',
  'OWNER',
  'MANAGER',
  'SUPERVISOR',
  'CASHIER',
  'COOK',
  'DRIVER',
  'CLIENT',
  'GUEST'
];

export const VALID_MEMBERSHIP_STATUSES: MembershipStatus[] = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'EXPIRED',
  'PENDING_MIGRATION'
];

/**
 * Validador Canónico para MembershipV3Entity
 */
export function validateMembershipV3(membership: Partial<MembershipV3Entity>): ValidationResult {
  const errors: string[] = [];

  // A. membershipId obligatorio
  if (!membership.membershipId || typeof membership.membershipId !== 'string' || membership.membershipId.trim().length === 0) {
    errors.push('membershipId es obligatorio y no puede estar vacío.');
  }

  // B. uid obligatorio
  if (!membership.uid || typeof membership.uid !== 'string' || membership.uid.trim().length === 0) {
    errors.push('uid es obligatorio y no puede estar vacío.');
  }

  // C. tenantId obligatorio (No se permite tenant vacío ni null)
  if (!membership.tenantId || typeof membership.tenantId !== 'string' || membership.tenantId.trim().length === 0) {
    errors.push('tenantId es obligatorio y no puede estar vacío.');
  }

  // G. role obligatorio y válido
  if (!membership.role || !VALID_EIAM_ROLES.includes(membership.role as EiamRole)) {
    errors.push(`role es inválido o no reconocido. Roles permitidos: ${VALID_EIAM_ROLES.join(', ')}.`);
  }

  // H. status obligatorio y válido
  if (!membership.status || !VALID_MEMBERSHIP_STATUSES.includes(membership.status as MembershipStatus)) {
    errors.push(`status es inválido. Estados permitidos: ${VALID_MEMBERSHIP_STATUSES.join(', ')}.`);
  }

  // I. permissions debe ser array
  if (!Array.isArray(membership.permissions)) {
    errors.push('permissions debe ser un array de strings (EiamAction[]).');
  }

  // J. schemaVersion debe ser exactamente "3.0"
  if (membership.schemaVersion !== '3.0') {
    errors.push("schemaVersion debe ser exactamente '3.0'.");
  }

  // K & L. Timestamps obligatorios
  if (!membership.createdAt || typeof membership.createdAt !== 'number' || membership.createdAt <= 0) {
    errors.push('createdAt debe ser un timestamp epoch numérico válido.');
  }
  if (!membership.updatedAt || typeof membership.updatedAt !== 'number' || membership.updatedAt <= 0) {
    errors.push('updatedAt debe ser un timestamp epoch numérico válido.');
  }

  // M, N, O, P. Validar tipos de scopes opcionales (si se proporcionan, deben ser string no vacío)
  if (membership.brandId !== undefined && membership.brandId !== null) {
    if (typeof membership.brandId !== 'string' || membership.brandId.trim().length === 0) {
      errors.push('brandId si se define debe ser un string no vacío o null.');
    }
  }

  if (membership.organizationId !== undefined && membership.organizationId !== null) {
    if (typeof membership.organizationId !== 'string' || membership.organizationId.trim().length === 0) {
      errors.push('organizationId si se define debe ser un string no vacío o null.');
    }
  }

  if (membership.businessId !== undefined && membership.businessId !== null) {
    if (typeof membership.businessId !== 'string' || membership.businessId.trim().length === 0) {
      errors.push('businessId si se define debe ser un string no vacío o null.');
    }
  }

  if (membership.branchId !== undefined && membership.branchId !== null) {
    if (typeof membership.branchId !== 'string' || membership.branchId.trim().length === 0) {
      errors.push('branchId si se define debe ser un string no vacío o null.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validador de Inmutabilidad para Membresías
 */
export function validateMembershipImmutability(
  existing: MembershipV3Entity,
  updates: Partial<MembershipV3Entity>
): ValidationResult {
  const errors: string[] = [];
  const immutableFields: (keyof MembershipV3Entity)[] = ['membershipId', 'uid', 'tenantId', 'createdAt', 'schemaVersion'];

  for (const field of immutableFields) {
    if (updates[field] !== undefined && updates[field] !== existing[field]) {
      errors.push(`El campo inmutable '${field}' no puede ser modificado una vez creada la membresía.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validador de Claims V3
 */
export function validateCustomClaimsV3(claims: Partial<CanonicalCustomClaimsV3>): ValidationResult {
  const errors: string[] = [];

  if (!claims.role || typeof claims.role !== 'string') {
    errors.push('claim role es obligatorio.');
  }
  if (claims.eiamVer !== 3) {
    errors.push('claim eiamVer debe ser exactamente 3.');
  }
  if (!claims.status || claims.status !== 'ACTIVE') {
    errors.push("claim status debe ser 'ACTIVE'.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validador de ActiveTenantContext
 */
export function validateActiveTenantContext(context: Partial<ActiveTenantContext>): ValidationResult {
  const errors: string[] = [];

  if (!context.tenantId || typeof context.tenantId !== 'string' || context.tenantId.trim().length === 0) {
    errors.push('tenantId es obligatorio en ActiveTenantContext.');
  }
  if (!context.membershipId || typeof context.membershipId !== 'string' || context.membershipId.trim().length === 0) {
    errors.push('membershipId es obligatorio en ActiveTenantContext.');
  }
  if (!context.role || !VALID_EIAM_ROLES.includes(context.role as EiamRole)) {
    errors.push('role es obligatorio y debe ser un EiamRole válido.');
  }
  if (!context.status || !VALID_MEMBERSHIP_STATUSES.includes(context.status as MembershipStatus)) {
    errors.push('status es obligatorio y debe ser un MembershipStatus válido.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
