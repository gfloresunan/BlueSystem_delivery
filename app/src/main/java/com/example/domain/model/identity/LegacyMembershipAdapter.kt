package com.example.domain.model.identity

import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.Membership as LegacyMembership

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Adaptador de Compatibilidad en Kotlin para Transformar Membresías Legacy.
 */

enum class ResolutionStatus {
    RESOLVED,
    DERIVABLE,
    AMBIGUOUS,
    UNKNOWN,
    MIGRATION_PENDING
}

data class ResolvedTenantContext(
    val tenantId: String,
    val brandId: String? = null,
    val organizationId: String? = null,
    val isAmbiguous: Boolean = false
)

data class MembershipResolution(
    val status: ResolutionStatus,
    val entity: MembershipV3? = null,
    val errorDetail: String? = null
)

object LegacyMembershipAdapter {

    fun transformLegacyToV3(
        legacy: LegacyMembership,
        resolvedContext: ResolvedTenantContext?
    ): MembershipResolution {
        // 1. Conflicto de titularidad
        if (resolvedContext?.isAmbiguous == true) {
            return MembershipResolution(
                status = ResolutionStatus.AMBIGUOUS,
                entity = null,
                errorDetail = "El negocio legacy '${legacy.businessId}' posee conflictos de titularidad entre múltiples tenants."
            )
        }

        // 2. Si no hay tenantId resoluble, marcar como MIGRATION_PENDING (Fail-Closed)
        if (resolvedContext == null || resolvedContext.tenantId.isBlank()) {
            return MembershipResolution(
                status = if (legacy.businessId.isNotBlank()) ResolutionStatus.MIGRATION_PENDING else ResolutionStatus.UNKNOWN,
                entity = null,
                errorDetail = if (legacy.businessId.isNotBlank())
                    "El negocio legacy '${legacy.businessId}' no tiene un tenantId asociado aún."
                else
                    "Registro de membresía huérfano sin businessId ni tenantId."
            )
        }

        val tenantId = resolvedContext.tenantId.trim()
        // Invariante: Prohibido tenant default ficticio
        if (tenantId.contains("default", ignoreCase = true) || tenantId.contains("tenant_bluesystem_default", ignoreCase = true)) {
            return MembershipResolution(
                status = ResolutionStatus.MIGRATION_PENDING,
                entity = null,
                errorDetail = "Violación de Gobernanza: Intento de resolución a tenant default ficticio bloqueado."
            )
        }

        val now = System.currentTimeMillis()
        val membershipId = if (legacy.membershipId.isNotBlank()) legacy.membershipId else "mem_${legacy.uid}_$tenantId"
        val status = when (legacy.status.name) {
            "ACTIVE" -> MembershipV3Status.ACTIVE
            "PENDING" -> MembershipV3Status.INVITED
            "SUSPENDED", "BLOCKED" -> MembershipV3Status.SUSPENDED
            "TERMINATED", "REVOKED" -> MembershipV3Status.REVOKED
            else -> MembershipV3Status.PENDING_MIGRATION
        }

        val v3 = MembershipV3(
            membershipId = membershipId,
            uid = legacy.uid,
            tenantId = tenantId,
            brandId = resolvedContext.brandId,
            organizationId = resolvedContext.organizationId,
            businessId = legacy.businessId.ifBlank { null },
            branchId = legacy.branchId,
            role = legacy.role,
            status = status,
            permissions = legacy.permissions,
            invitedBy = legacy.invitedBy.ifBlank { null },
            createdAt = legacy.createdAt?.toDate()?.time ?: now,
            updatedAt = now,
            schemaVersion = "3.0"
        )

        val validation = MembershipV3Validators.validateMembershipV3(v3)
        if (!validation.isValid) {
            return MembershipResolution(
                status = ResolutionStatus.MIGRATION_PENDING,
                entity = null,
                errorDetail = "Fallo de validación V3 al transformar: ${validation.errors.joinToString("; ")}"
            )
        }

        return MembershipResolution(
            status = ResolutionStatus.RESOLVED,
            entity = v3
        )
    }
}
