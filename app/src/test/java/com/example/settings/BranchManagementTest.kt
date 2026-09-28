package com.example.settings

import com.example.domain.model.settings.BranchConfig
import org.junit.Assert.*
import org.junit.Test

class BranchManagementTest {

    @Test
    fun testBranchConfigCreation() {
        val branch = BranchConfig(branchId = "b_02", name = "Sucursal Metrocentro", deliveryRadiusKm = 7.5)
        assertEquals("b_02", branch.branchId)
        assertTrue(branch.isActive)
    }
}
