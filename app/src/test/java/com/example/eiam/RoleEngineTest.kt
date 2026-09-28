package com.example.eiam

import com.example.eiam.domain.engine.RoleEngine
import com.example.eiam.domain.model.EiamRole
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RoleEngineTest {

    @Test
    fun testHasMinimumRole_superAdminHasAccessToEverything() {
        assertTrue(RoleEngine.hasMinimumRole(EiamRole.SUPER_ADMIN, EiamRole.OWNER))
        assertTrue(RoleEngine.hasMinimumRole(EiamRole.SUPER_ADMIN, EiamRole.CLIENT))
    }

    @Test
    fun testHasMinimumRole_clientCannotAccessOwner() {
        assertFalse(RoleEngine.hasMinimumRole(EiamRole.CLIENT, EiamRole.OWNER))
    }

    @Test
    fun testIsBusinessRole() {
        assertTrue(EiamRole.OWNER.isBusinessRole())
        assertTrue(EiamRole.MANAGER.isBusinessRole())
        assertFalse(EiamRole.CLIENT.isBusinessRole())
    }

    @Test
    fun testIsPlatformAdmin() {
        assertTrue(EiamRole.SUPER_ADMIN.isPlatformAdmin())
        assertTrue(EiamRole.ADMIN.isPlatformAdmin())
        assertFalse(EiamRole.OWNER.isPlatformAdmin())
    }
}
