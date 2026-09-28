package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

/**
 * Modelo canónico multi-plataforma para el App Update Center.
 * Persistido bajo /system_config/global.appUpdate como Single Source of Truth (SSOT).
 */
@IgnoreExtraProperties
data class AppUpdateConfig(
    val enabled: Boolean = false,
    val updateType: String = "RECOMMENDED", // INFO, RECOMMENDED, FORCED
    val latestVersion: String = "1.0.0",
    val minimumVersion: String = "1.0.0",
    val targetPlatforms: List<String> = listOf("ANDROID", "IOS"),
    val title: String = "Actualiza BlueSystem Delivery",
    val subtitle: String = "Tenemos una nueva versión para ti",
    val message: String = "",
    val imageUrl: String? = null,
    val iconUrl: String? = null,
    val showLogo: Boolean = true,
    val primaryButtonText: String = "Actualizar ahora",
    val secondaryButtonText: String = "Más tarde",
    val allowDismiss: Boolean = true,
    val forceUpdate: Boolean = false,
    val playStoreUrl: String = "",
    val appStoreUrl: String = "",
    val backgroundColor: String? = null,
    val primaryButtonColor: String? = null,
    val textColor: String? = null,
    val startAt: String? = null,
    val endAt: String? = null,
    val displayFrequency: String = "EACH_SESSION", // ONCE, EACH_SESSION, COOLDOWN
    val cooldownHours: Int = 24,
    val campaignId: String = "",
    val schemaVersion: Int = 1
)

/**
 * Resultado de la resolución evaluada por [AppUpdateResolver].
 */
sealed class AppUpdateResolution {
    object NoUpdate : AppUpdateResolution()

    data class ShowUpdate(
        val config: AppUpdateConfig,
        val isForced: Boolean,
        val canDismiss: Boolean,
        val storeUrl: String,
        val resolutionReason: String = ""
    ) : AppUpdateResolution()
}
