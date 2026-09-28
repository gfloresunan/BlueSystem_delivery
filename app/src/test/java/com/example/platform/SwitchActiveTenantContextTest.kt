package com.example.platform

import com.example.domain.model.identity.SwitchActiveTenantContextRequest
import com.example.domain.model.identity.SwitchActiveTenantContextResponse
import org.junit.Assert.*
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.5)
 * Pruebas Unitarias JUnit para Modelos de switchActiveTenantContext en Android.
 */
class SwitchActiveTenantContextTest {

    @Test
    fun `test valid switch context request structure`() {
        val req = SwitchActiveTenantContextRequest(targetMembershipId = "mem_123")
        assertEquals("mem_123", req.targetMembershipId)
        assertTrue(req.targetMembershipId.isNotBlank())
    }

    @Test
    fun `test valid switch context response simulation structure`() {
        val resp = SwitchActiveTenantContextResponse(
            success = true,
            activeTenantId = "ten_fitoni_77a",
            activeBrandId = "br_fitoni_express",
            activeOrgId = "org_fitoni_holding",
            activeBusinessId = "biz_fitoni_burger",
            activeBranchId = "br_sucursal_central",
            activeRole = "OWNER",
            membershipId = "mem_123",
            eiamVer = 3,
            tokenRefreshRequired = true,
            simulation = true
        )

        assertTrue(resp.success)
        assertTrue(resp.simulation)
        assertTrue(resp.tokenRefreshRequired)
        assertEquals(3, resp.eiamVer)
        assertEquals("ten_fitoni_77a", resp.activeTenantId)
        assertEquals("OWNER", resp.activeRole)
    }

    @Test
    fun `test blank targetMembershipId is detectable`() {
        val req = SwitchActiveTenantContextRequest(targetMembershipId = "   ")
        assertTrue(req.targetMembershipId.isBlank())
    }
}
