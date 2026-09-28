package com.example.enterprise.tenant

import com.example.domain.model.menu.MenuConflictException

data class BrandingSettings(
    val logoUrl: String = "",
    val primaryColorHex: String = "#FF6D00",
    val themeMode: String = "DARK",
    val language: String = "es",
    val currency: String = "USD",
    val timeZone: String = "America/Managua"
)

data class TenantIntegrations(
    val printerIp: String? = null,
    val posSystemId: String? = null,
    val isKdsEnabled: Boolean = true,
    val isAnalyticsEnabled: Boolean = true
)

data class RestaurantTenantSettings(
    val restaurantId: String = "",
    val version: Long = 1L,
    val checksum: String = "",
    val branding: BrandingSettings = BrandingSettings(),
    val integrations: TenantIntegrations = TenantIntegrations(),
    val featureOverrides: Map<String, Boolean> = emptyMap(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Servidor Enterprise: TenantSettingsManager (Pilar 3).
 * Gestiona la personalización desacoplada por restaurante sin requerir recompilación de la app.
 * Soporta bloqueo optimista, versionado e inmutabilidad.
 */
class TenantSettingsManager {

    private val tenantSettingsMemory = mutableMapOf<String, RestaurantTenantSettings>()

    fun saveSettings(settings: RestaurantTenantSettings, expectedVersion: Long? = null): Result<RestaurantTenantSettings> {
        val current = tenantSettingsMemory[settings.restaurantId]

        if (expectedVersion != null && current != null && current.version > expectedVersion) {
            return Result.failure(
                MenuConflictException(
                    restaurantId = settings.restaurantId,
                    localVersion = settings.version,
                    serverVersion = current.version
                )
            )
        }

        val newVersion = (current?.version ?: 0L) + 1L
        val updated = settings.copy(version = newVersion, updatedAt = System.currentTimeMillis())
        tenantSettingsMemory[settings.restaurantId] = updated
        return Result.success(updated)
    }

    fun getSettings(restaurantId: String): RestaurantTenantSettings {
        return tenantSettingsMemory[restaurantId] ?: RestaurantTenantSettings(restaurantId = restaurantId)
    }
}
