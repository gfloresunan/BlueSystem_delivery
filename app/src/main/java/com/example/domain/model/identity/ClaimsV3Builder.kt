package com.example.domain.model.identity

import com.example.eiam.domain.model.EiamRole

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Pure Custom Claims v3 Builder en Kotlin.
 */
object ClaimsV3Builder {

    fun buildCanonicalClaims(context: ActiveTenantContext): CanonicalCustomClaimsV3 {
        return CanonicalCustomClaimsV3(
            role = context.role.name,
            tenantId = context.tenantId,
            brandId = context.brandId,
            orgId = context.organizationId,
            businessId = context.businessId,
            branchId = context.branchId,
            status = "ACTIVE",
            eiamVer = 3
        )
    }

    fun buildPlatformClaims(role: EiamRole): CanonicalCustomClaimsV3 {
        return CanonicalCustomClaimsV3(
            role = role.name,
            tenantId = null,
            brandId = null,
            orgId = null,
            businessId = null,
            branchId = null,
            status = "ACTIVE",
            eiamVer = 3
        )
    }

    fun buildGlobalClientClaims(): CanonicalCustomClaimsV3 {
        return CanonicalCustomClaimsV3(
            role = "CLIENT",
            tenantId = null,
            brandId = null,
            orgId = null,
            businessId = null,
            branchId = null,
            status = "ACTIVE",
            eiamVer = 3
        )
    }
}
