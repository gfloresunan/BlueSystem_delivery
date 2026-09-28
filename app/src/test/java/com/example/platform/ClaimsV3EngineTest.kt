package com.example.platform

import com.example.domain.model.identity.*
import com.example.eiam.domain.model.EiamRole
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Pruebas Unitarias JUnit para Claims V3 Engine, Active Context Deriver y Auth Safety Gate en Android.
 */
class ClaimsV3EngineTest {

    @Test
    fun `test derive active context from valid V3 membership`() {
        val membership = MembershipV3(
            membershipId = "mem_001",
            uid = "usr_001",
            tenantId = "ten_fitoni_77a",
            brandId = "br_fitoni_express",
            organizationId = "org_fitoni_holding",
            businessId = "biz_fitoni_burger",
            branchId = "br_sucursal_central",
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE
        )

        val result = ActiveContextDeriver.deriveFromMembership(membership)
        assertTrue(result.success)
        assertNotNull(result.context)
        assertEquals("ten_fitoni_77a", result.context?.tenantId)
        assertEquals(EiamRole.OWNER, result.context?.role)
    }

    @Test
    fun `test derive active context fails for suspended membership`() {
        val membership = MembershipV3(
            membershipId = "mem_002",
            uid = "usr_002",
            tenantId = "ten_001",
            role = EiamRole.CASHIER,
            status = MembershipV3Status.SUSPENDED
        )

        val result = ActiveContextDeriver.deriveFromMembership(membership)
        assertFalse(result.success)
        assertNull(result.context)
    }

    @Test
    fun `test derive active context fails for default tenant`() {
        val membership = MembershipV3(
            membershipId = "mem_003",
            uid = "usr_003",
            tenantId = "tenant_bluesystem_default",
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE
        )

        val result = ActiveContextDeriver.deriveFromMembership(membership)
        assertFalse(result.success)
        assertNull(result.context)
    }

    @Test
    fun `test build canonical claims matches context`() {
        val context = ActiveTenantContext(
            tenantId = "ten_001",
            brandId = "br_001",
            organizationId = "org_001",
            businessId = "biz_001",
            branchId = "br_001",
            role = EiamRole.MANAGER,
            membershipId = "mem_001",
            status = MembershipV3Status.ACTIVE
        )

        val claims = ClaimsV3Builder.buildCanonicalClaims(context)
        assertEquals("MANAGER", claims.role)
        assertEquals("ten_001", claims.tenantId)
        assertEquals("br_001", claims.brandId)
        assertEquals(3, claims.eiamVer)
        assertEquals("ACTIVE", claims.status)
    }

    @Test
    fun `test build platform claims has null tenantId`() {
        val claims = ClaimsV3Builder.buildPlatformClaims(EiamRole.SUPER_ADMIN)
        assertEquals("SUPER_ADMIN", claims.role)
        assertNull(claims.tenantId)
        assertEquals(3, claims.eiamVer)
    }

    @Test
    fun `test claims size guard under 800 bytes passes`() {
        val json = """{"role":"OWNER","tenantId":"ten_001","status":"ACTIVE","eiamVer":3}"""
        val byteSize = ClaimsSizeGuard.measureBytes(json)
        val evaluation = ClaimsSizeGuard.evaluate(byteSize)

        assertTrue(evaluation.isValid)
        assertEquals(ClaimsSizeStatus.PASS, evaluation.status)
        assertTrue(byteSize < 800)
    }

    @Test
    fun `test claims size guard over 1000 bytes fails`() {
        val oversizedBytes = 1050
        val evaluation = ClaimsSizeGuard.evaluate(oversizedBytes)

        assertFalse(evaluation.isValid)
        assertEquals(ClaimsSizeStatus.FAIL_OVERSIZED, evaluation.status)
    }

    @Test
    fun `test auth safety gate throws AuthMutationBlockedException and mutation count is zero`() = runBlocking {
        val gateway = AuthSafetyGate.getGateway()
        assertFalse(gateway.isMutationPermitted())

        var blocked = false
        try {
            gateway.setCustomUserClaims("usr_test", mapOf("role" to "HACKED"))
        } catch (e: AuthMutationBlockedException) {
            blocked = true
        }

        assertTrue("AuthSafetyGate debe bloquear cualquier mutación", blocked)
    }
}
