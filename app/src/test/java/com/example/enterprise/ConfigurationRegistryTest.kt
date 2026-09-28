package com.example.enterprise

import com.example.enterprise.config.ConfigType
import com.example.enterprise.config.ConfigValue
import com.example.enterprise.config.ConfigurationRegistryImpl
import com.example.enterprise.config.Environment
import org.junit.Assert.assertEquals
import org.junit.Test

class ConfigurationRegistryTest {

    private val registry = ConfigurationRegistryImpl()

    @Test
    fun `test register and retrieve config values per environment`() {
        val devConfig = ConfigValue("api_url", "https://dev.api.com", ConfigType.STRING, environment = Environment.DEV)
        val prodConfig = ConfigValue("api_url", "https://api.bluesystem.com", ConfigType.STRING, environment = Environment.PRODUCTION)

        registry.registerConfig(devConfig)
        registry.registerConfig(prodConfig)

        assertEquals("https://dev.api.com", registry.getString("api_url", Environment.DEV))
        assertEquals("https://api.bluesystem.com", registry.getString("api_url", Environment.PRODUCTION))
    }
}
