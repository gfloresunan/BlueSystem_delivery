package com.example.domain.model.identity

import androidx.annotation.Keep
import com.example.eiam.domain.model.EiamRole

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Modelo Canónico en Kotlin para Membresías Multi-Tenant / Multi-Brand.
 *
 * Coexiste con el modelo Legacy Membership.kt sin alterar flujos operacionales.
 */

enum class MembershipV3Status {
    INVITED,
    ACTIVE,
    SUSPENDED,
    REVOKED,
    EXPIRED,
    PENDING_MIGRATION
}

@Keep
data class MembershipV3(
    val membershipId: String = "",
    val uid: String = "",
    val tenantId: String = "",
    val brandId: String? = null,
    val organizationId: String? = null,
    val businessId: String? = null,
    val branchId: String? = null,
    val role: EiamRole = EiamRole.CLIENT,
    val status: MembershipV3Status = MembershipV3Status.PENDING_MIGRATION,
    val permissions: List<String> = emptyList(),
    val invitedBy: String? = null,
    val invitedAt: Long? = null,
    val acceptedAt: Long? = null,
    val revokedAt: Long? = null,
    val revokedBy: String? = null,
    val revokedReason: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val schemaVersion: String = "3.0"
)
