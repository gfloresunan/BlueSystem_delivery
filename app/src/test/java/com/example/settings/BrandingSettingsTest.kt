package com.example.settings

import com.example.domain.model.settings.BrandingConfig
import org.junit.Assert.*
import org.junit.Test

class BrandingSettingsTest {

    @Test
    fun testBrandingConfigDefaults() {
        val branding = BrandingConfig()
        assertEquals("#2563EB", branding.primaryColorHex)
    }
}
