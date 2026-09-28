package com.example.eiam.domain.model

/**
 * EIAM — MerchantProfile (EIAM v2.1)
 * Perfil desacoplado del usuario comerciante para gestionar preferencias y datos personales.
 */
data class MerchantProfile(
    val uid: String,
    val displayName: String? = null,
    val photoUrl: String? = null,
    val phone: String? = null,
    val preferredLanguage: String = "es",
    val assignedBusinessIds: List<String> = emptyList(),
    val notificationPreferences: Map<String, Boolean> = mapOf(
        "newOrders" to true,
        "inventoryAlerts" to true,
        "dailySummary" to true
    ),
    val twoFactorEnabled: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
