package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

/**
 * Modelo del Centro de Preferencias de Notificaciones del Usuario (Fase 12 Enterprise).
 * Permite gestionar qué tipos de notificaciones desea recibir cada usuario desde su Perfil.
 */
@IgnoreExtraProperties
data class NotificationPreferences(
    val promotions: Boolean = true, // Promociones y ofertas
    val coupons: Boolean = true,    // Cupones de descuento
    val orders: Boolean = true,     // Estado de pedidos (Esencial)
    val news: Boolean = true,       // Noticias y novedades
    val support: Boolean = true,    // Mensajes del soporte
    val system: Boolean = true      // Actualizaciones del sistema
) {
    /**
     * Evalúa si una notificación de cierto tipo/categoría debe ser entregada según las preferencias del usuario.
     */
    fun isNotificationAllowed(type: String, category: String): Boolean {
        return when (type.uppercase()) {
            "PROMOTION" -> promotions
            "NEWS" -> news
            "ACCOUNT" -> true
            "ORDER" -> orders
            "PAYMENT" -> orders
            "SYSTEM" -> system
            "SECURITY" -> true // Las notificaciones de seguridad nunca pueden desactivarse
            "MAINTENANCE" -> system
            else -> when (category.lowercase()) {
                "promociones" -> promotions
                "cupones" -> coupons
                "pedidos" -> orders
                "novedades" -> news
                "sistema" -> system
                else -> true
            }
        }
    }
}
