package com.example.domain.model.identity

import androidx.annotation.Keep

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Contrato de Custom Claims JWT V3 en Kotlin.
 */
@Keep
data class CanonicalCustomClaimsV3(
    val role: String = "CLIENT",
    val tenantId: String? = null,
    val brandId: String? = null,
    val orgId: String? = null,
    val businessId: String? = null,
    val branchId: String? = null,
    val status: String = "ACTIVE",
    val eiamVer: Int = 3
)
