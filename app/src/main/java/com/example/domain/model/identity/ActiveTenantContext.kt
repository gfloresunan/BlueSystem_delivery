package com.example.domain.model.identity

import androidx.annotation.Keep
import com.example.eiam.domain.model.EiamRole

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Modelo de Contexto Activo de Tenant en Kotlin.
 */
@Keep
data class ActiveTenantContext(
    val tenantId: String = "",
    val brandId: String? = null,
    val organizationId: String? = null,
    val businessId: String? = null,
    val branchId: String? = null,
    val role: EiamRole = EiamRole.CLIENT,
    val membershipId: String = "",
    val status: MembershipV3Status = MembershipV3Status.ACTIVE
)
