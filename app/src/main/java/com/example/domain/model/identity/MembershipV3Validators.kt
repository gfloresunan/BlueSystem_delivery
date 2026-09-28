package com.example.domain.model.identity

import com.example.domain.model.platform.ValidationResult

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Validadores Puros de Dominio en Kotlin para Membresías e Identidad Multi-Tenant.
 */
object MembershipV3Validators {

    fun validateMembershipV3(membership: MembershipV3): ValidationResult {
        val errors = mutableListOf<String>()

        if (membership.membershipId.isBlank()) {
            errors.add("membershipId es obligatorio y no puede estar vacío.")
        }
        if (membership.uid.isBlank()) {
            errors.add("uid es obligatorio y no puede estar vacío.")
        }
        if (membership.tenantId.isBlank()) {
            errors.add("tenantId es obligatorio y no puede estar vacío.")
        }
        if (membership.schemaVersion != "3.0") {
            errors.add("schemaVersion debe ser exactamente '3.0'.")
        }
        if (membership.createdAt <= 0) {
            errors.add("createdAt debe ser un timestamp positivo.")
        }
        if (membership.updatedAt <= 0) {
            errors.add("updatedAt debe ser un timestamp positivo.")
        }

        // Validación de scopes opcionales
        membership.brandId?.let {
            if (it.isBlank()) errors.add("brandId no puede ser un string vacío.")
        }
        membership.organizationId?.let {
            if (it.isBlank()) errors.add("organizationId no puede ser un string vacío.")
        }
        membership.businessId?.let {
            if (it.isBlank()) errors.add("businessId no puede ser un string vacío.")
        }
        membership.branchId?.let {
            if (it.isBlank()) errors.add("branchId no puede ser un string vacío.")
        }

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateActiveTenantContext(context: ActiveTenantContext): ValidationResult {
        val errors = mutableListOf<String>()

        if (context.tenantId.isBlank()) {
            errors.add("tenantId es obligatorio en ActiveTenantContext.")
        }
        if (context.membershipId.isBlank()) {
            errors.add("membershipId es obligatorio en ActiveTenantContext.")
        }

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateCustomClaimsV3(claims: CanonicalCustomClaimsV3): ValidationResult {
        val errors = mutableListOf<String>()

        if (claims.role.isBlank()) {
            errors.add("claim role es obligatorio.")
        }
        if (claims.eiamVer != 3) {
            errors.add("claim eiamVer debe ser exactamente 3.")
        }
        if (claims.status != "ACTIVE") {
            errors.add("claim status debe ser 'ACTIVE'.")
        }

        return ValidationResult(errors.isEmpty(), errors)
    }
}
