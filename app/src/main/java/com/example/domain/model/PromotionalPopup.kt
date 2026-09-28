package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

/**
 * Modelo de datos para las Campañas de Pop-Up Promocional (Actividad #10 Enterprise).
 * Diseñado bajo arquitectura OS-Agnostic (100% compatible con Android e iOS).
 */
@IgnoreExtraProperties
data class PromotionalPopup(
    val id: String = "",
    val tenantId: String = "GLOBAL",
    val title: String = "",
    val message: String = "",
    val imageUrl: String = "",
    val actionLabel: String = "Participar",
    val actionType: String = "NONE", // NONE, EXTERNAL_URL, WHATSAPP, INTERNAL_ROUTE, DEEPLINK, BUSINESS
    val actionTarget: String = "",
    val priority: Int = 10,
    val frequency: String = "ONCE_PER_SESSION", // ONCE, ONCE_PER_SESSION, ONCE_PER_DAY, ALWAYS
    val context: String = "CUSTOMER_HOME", // CUSTOMER_HOME, APP_OPEN
    val startDate: String = "",
    val endDate: String = "",
    val active: Boolean = true,
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)
