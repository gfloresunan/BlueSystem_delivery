package com.example.domain.model.identity

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Active Context Deriver en Kotlin.
 */

data class ActiveContextResult(
    val success: Boolean,
    val context: ActiveTenantContext? = null,
    val errorDetail: String? = null
)

object ActiveContextDeriver {

    fun deriveFromDualRead(result: DualReadResult): ActiveContextResult {
        if (result.status != DualReadStatus.RESOLVED_V3 && result.status != DualReadStatus.RESOLVED_LEGACY) {
            return ActiveContextResult(
                success = false,
                context = null,
                errorDetail = "No se puede derivar contexto activo para status: ${result.status}."
            )
        }

        val membership = result.membership ?: return ActiveContextResult(
            success = false,
            context = null,
            errorDetail = "Membresía nula."
        )

        return deriveFromMembership(membership)
    }

    fun deriveFromMembership(membership: MembershipV3): ActiveContextResult {
        if (membership.status != MembershipV3Status.ACTIVE) {
            return ActiveContextResult(
                success = false,
                context = null,
                errorDetail = "La membresía no está en estado ACTIVE."
            )
        }

        if (membership.tenantId.isBlank()) {
            return ActiveContextResult(
                success = false,
                context = null,
                errorDetail = "tenantId vacío."
            )
        }

        if (membership.tenantId.contains("default", ignoreCase = true) ||
            membership.tenantId.contains("tenant_bluesystem_default", ignoreCase = true)) {
            return ActiveContextResult(
                success = false,
                context = null,
                errorDetail = "Violación de Seguridad: tenant default ficticio bloqueado."
            )
        }

        val context = ActiveTenantContext(
            tenantId = membership.tenantId,
            brandId = membership.brandId,
            organizationId = membership.organizationId,
            businessId = membership.businessId,
            branchId = membership.branchId,
            role = membership.role,
            membershipId = membership.membershipId,
            status = MembershipV3Status.ACTIVE
        )

        return ActiveContextResult(
            success = true,
            context = context
        )
    }
}
