package com.example.eiam

import com.example.eiam.domain.engine.PermissionEngine
import com.example.eiam.domain.model.EiamAction
import com.example.eiam.domain.model.EiamRole
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissionEngineTest {

    @Test
    fun testHasPermission_superAdminAllowedAll() {
        val allowed = PermissionEngine.hasPermission(
            userRole = EiamRole.SUPER_ADMIN,
            action = EiamAction.CANCEL_ORDER
        )
        assertTrue(allowed)
    }

    @Test
    fun testHasPermission_ownerCrossTenantDenied() {
        val allowed = PermissionEngine.hasPermission(
            userRole = EiamRole.OWNER,
            action = EiamAction.CREATE_PRODUCT,
            userBusinessId = "biz_100",
            targetBusinessId = "biz_200"
        )
        assertFalse(allowed)
    }

    @Test
    fun testHasPermission_ownerSameTenantAllowed() {
        val allowed = PermissionEngine.hasPermission(
            userRole = EiamRole.OWNER,
            action = EiamAction.CREATE_PRODUCT,
            userBusinessId = "biz_100",
            targetBusinessId = "biz_100"
        )
        assertTrue(allowed)
    }
}
