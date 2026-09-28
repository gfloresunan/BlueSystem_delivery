package com.example.settings

import com.example.domain.engine.settings.RestaurantSettingsEngine
import com.example.domain.model.settings.RestaurantSettings
import org.junit.Assert.*
import org.junit.Test

class RestaurantSettingsEngineTest {

    @Test
    fun testChecksumComputationAndValidation() {
        val settings = RestaurantSettings(commercialName = "Burger Joint Enterprise")
        assertTrue(RestaurantSettingsEngine.validateSettings(settings))

        val checksum = RestaurantSettingsEngine.computeChecksumSha256(settings)
        assertNotNull(checksum)

        val updated = RestaurantSettingsEngine.applyVersionIncrement(settings)
        assertEquals(2, updated.version)
    }
}
