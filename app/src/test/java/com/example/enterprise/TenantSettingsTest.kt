package com.example.enterprise

import com.example.enterprise.tenant.BrandingSettings
import com.example.enterprise.tenant.RestaurantTenantSettings
import com.example.enterprise.tenant.TenantSettingsManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TenantSettingsTest {

    private val manager = TenantSettingsManager()

    @Test
    fun `test save and update tenant settings without app recompile`() {
        val settings = RestaurantTenantSettings(
            restaurantId = "rest1",
            branding = BrandingSettings(logoUrl = "https://img.com/logo.png", primaryColorHex = "#FF0000")
        )

        val result = manager.saveSettings(settings)
        assertTrue(result.isSuccess)

        val fetched = manager.getSettings("rest1")
        assertEquals("#FF0000", fetched.branding.primaryColorHex)
        assertEquals(1L, fetched.version)
    }
}
