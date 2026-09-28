package com.example.eiam.domain.model

import androidx.annotation.Keep

/**
 * Single Source of Truth para la Identidad Empresarial de Comercios en Android (ADR-011 / ADR-016).
 * Encapsula la identidad canónica validada contra Firebase Auth Claims y Firestore /membership.
 */
@Keep
data class MerchantIdentityContext(
    val uid: String = "",
    val email: String = "",
    val tenantId: String = "",
    val businessId: String = "",
    val branchId: String = "",
    val orgId: String = "",
    val role: EiamRole = EiamRole.GUEST,
    val membershipId: String = "",
    val permissions: List<String> = emptyList(),
    val isResolved: Boolean = false,
    val errorMessage: String? = null
)
