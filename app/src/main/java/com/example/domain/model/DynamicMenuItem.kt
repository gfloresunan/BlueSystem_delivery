package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

/**
 * Modelo de datos para las opciones del Menú Dinámico Administrable (Actividad #10 Enterprise).
 * Diseñado bajo arquitectura OS-Agnostic (100% compatible con Android e iOS).
 */
@IgnoreExtraProperties
data class DynamicMenuItem(
    val id: String = "",
    val tenantId: String = "GLOBAL",
    val title: String = "",
    val description: String = "",
    val iconKey: String = "whatsapp", // whatsapp, vip, gift, tag, card, support, link, info, location, bell
    val destinationType: String = "INTERNAL_ROUTE", // WHATSAPP, EXTERNAL_URL, INTERNAL_ROUTE, DEEPLINK
    val destination: String = "",
    val order: Int = 1,
    val active: Boolean = true,
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)
