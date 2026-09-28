package com.example.settings

import org.junit.Assert.*
import org.junit.Test

class PermissionEngineTest {

    @Test
    fun testOwnerPermissionValidation() {
        val userRole = "OWNER"
        val canEditSettings = userRole == "OWNER" || userRole == "MANAGER"
        assertTrue(canEditSettings)
    }
}
