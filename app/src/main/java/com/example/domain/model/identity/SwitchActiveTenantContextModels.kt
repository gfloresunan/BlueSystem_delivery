package com.example.domain.model.identity

import androidx.annotation.Keep

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.5)
 * Contratos de Input y Output para switchActiveTenantContext en Android.
 */

@Keep
data class SwitchActiveTenantContextRequest(
    val targetMembershipId: String = ""
)

@Keep
data class SwitchActiveTenantContextResponse(
    val success: Boolean = false,
    val activeTenantId: String = "",
    val activeBrandId: String? = null,
    val activeOrgId: String? = null,
    val activeBusinessId: String? = null,
    val activeBranchId: String? = null,
    val activeRole: String = "",
    val membershipId: String = "",
    val eiamVer: Int = 3,
    val tokenRefreshRequired: Boolean = true,
    val simulation: Boolean = true
)
