package com.example.domain.engine.settings

import com.example.domain.model.settings.RestaurantSettings
import java.security.MessageDigest

/**
 * Motor Centralizado de Configuración (RestaurantSettingsEngine RSC)
 * Proporciona validación, checksum SHA-256, versionado, rollback y exportación.
 */
object RestaurantSettingsEngine {

    fun validateSettings(settings: RestaurantSettings): Boolean {
        if (settings.commercialName.isBlank()) return false
        if (settings.deliveryFee < 0) return false
        if (settings.maxDeliveryRadiusKm <= 0) return false
        return true
    }

    fun computeChecksumSha256(settings: RestaurantSettings): String {
        val rawData = "${settings.restaurantId}_${settings.commercialName}_${settings.version}_${settings.updatedAtMs}"
        val bytes = MessageDigest.getInstance("SHA-256").digest(rawData.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun applyVersionIncrement(settings: RestaurantSettings): RestaurantSettings {
        val newVer = settings.version + 1
        val updated = settings.copy(version = newVer, updatedAtMs = System.currentTimeMillis())
        val newChecksum = computeChecksumSha256(updated)
        return updated.copy(checksumSha256 = newChecksum)
    }

    fun exportToJsonString(settings: RestaurantSettings): String {
        return """
            {
                "restaurantId": "${settings.restaurantId}",
                "commercialName": "${settings.commercialName}",
                "version": ${settings.version},
                "checksumSha256": "${settings.checksumSha256}",
                "readinessScore": ${settings.readiness.readinessScorePercent}
            }
        """.trimIndent()
    }
}
