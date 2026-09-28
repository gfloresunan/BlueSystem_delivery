package com.example.eiam

import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.MerchantIdentityContext
import com.example.eiam.domain.resolver.MerchantIdentityResolver
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class MerchantIdentityResolverTest {

    @Before
    fun setUp() {
        MerchantIdentityResolver.clearContext()
    }

    @Test
    fun testMerchantIdentityContext_CreationAndImmutability() {
        val context = MerchantIdentityContext(
            uid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2",
            email = "tecnostore@bluesystemdelivery.com",
            tenantId = "ten_bluesystem_core",
            businessId = "biz_canonical_tecnostore",
            branchId = "br_canonical_tecnostore_main",
            orgId = "org_1787895553815",
            role = EiamRole.OWNER,
            membershipId = "mem_canonical_tecnostore_owner",
            permissions = listOf("CATALOG_WRITE", "ORDERS_MANAGE"),
            isResolved = true,
            errorMessage = null
        )

        assertEquals("04JAKPrmXjg7s2CDiT3kUPOhBwn2", context.uid)
        assertEquals("biz_canonical_tecnostore", context.businessId)
        assertEquals("br_canonical_tecnostore_main", context.branchId)
        assertEquals("org_1787895553815", context.orgId)
        assertEquals("ten_bluesystem_core", context.tenantId)
        assertEquals(EiamRole.OWNER, context.role)
        assertTrue(context.isResolved)
        assertNull(context.errorMessage)
    }

    @Test
    fun testMerchantIdentityContext_FailClosedState() {
        val failedContext = MerchantIdentityContext(
            uid = "unknown_user_123",
            email = "attacker@example.com",
            businessId = "",
            isResolved = false,
            errorMessage = "BUSINESS_ID_NOT_FOUND: No se encontró ningún businessId asignado"
        )

        assertFalse(failedContext.isResolved)
        assertEquals("", failedContext.businessId)
        assertNotNull(failedContext.errorMessage)
    }

    @Test
    fun testClearContext_PurgesCache() {
        assertNull(MerchantIdentityResolver.getCachedContext())
    }
}
