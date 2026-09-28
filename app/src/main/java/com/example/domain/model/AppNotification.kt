package com.example.domain.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

/**
 * Modelo interactivo de botón para notificaciones enterprise.
 */
@IgnoreExtraProperties
data class NotificationButton(
    val id: String = "",
    val label: String = "",
    val action: String = "",
    val deepLink: String = ""
)

/**
 * Modelo Enterprise de Notificaciones del Sistema y Campañas Administrativas (Fase 12).
 */
@IgnoreExtraProperties
data class AppNotification(
    val id: String = "",
    val title: String = "",
    val body: String = "",
    val imageUrl: String = "",
    val actionUrl: String = "",
    val deepLink: String = "",
    val navigationRoute: String = "",
    val action: String = "",
    val destinationType: String = "",
    val destinationRoute: String = "",
    val fallbackDestination: String = "",
    val entityId: String = "",
    val entityType: String = "",
    val orderId: String = "",
    val tripId: String = "",
    val businessId: String = "",
    val productId: String = "",
    val couponId: String = "",
    val supportConversationId: String = "",
    val category: String = "Sistema", // Pedidos, Promociones, Pagos, Cuenta, Sistema, Seguridad, Novedades, Comercio, Delivery
    val type: String = "SYSTEM", // SYSTEM, ORDER, PAYMENT, PROMOTION, SECURITY, ACCOUNT, BUSINESS, COURIER, SUPERVISOR, ADMIN, AUDIT, MAINTENANCE, NEWS
    val channel: String = "IN_APP", // PUSH, IN_APP, POPUP, EMAIL, SMS, WHATSAPP, WEB_ADMIN, WEB_BROWSER
    val priority: String = "NORMAL", // LOW, NORMAL, HIGH, CRITICAL
    val targetRole: String = "",
    val campaignId: String = "",
    val source: String = "SYSTEM",
    val tenantId: String = "",
    val version: Int = 1,
    val buttons: List<Map<String, String>> = emptyList(),
    val openCount: Int = 0,
    val lastButtonPressed: String = "",
    @get:PropertyName("isRead")
    val isRead: Boolean = false,
    @get:PropertyName("read")
    val read: Boolean = false,
    @get:PropertyName("deletedByUser")
    val deletedByUser: Boolean = false,
    @get:PropertyName("dismissed")
    val dismissed: Boolean = false,
    val sentAt: Timestamp? = null,
    val readAt: Timestamp? = null,
    val openedAt: Timestamp? = null,
    val clickedAt: Timestamp? = null,
    val expiresAt: Timestamp? = null,
    val scheduledAt: Timestamp? = null,
    val visibilityStatus: String = "VISIBLE", // VISIBLE, DISABLED, DELETED
    val readSource: String = "", // in_app, system_tray, deep_link, notification_center
    val readByUid: String = ""
) {
    fun isVisibleToUser(): Boolean = visibilityStatus.uppercase() != "DISABLED" && visibilityStatus.uppercase() != "DELETED" && !deletedByUser && !isExpired()
    fun getEffectiveIsRead(): Boolean = isRead || read
    fun isCriticalPriority(): Boolean = priority.equals("CRITICA", ignoreCase = true) || priority.equals("CRITICAL", ignoreCase = true)

    /**
     * Evalúa si la notificación está vencida según su fecha de expiración.
     */
    fun isExpired(): Boolean {
        if (expiresAt == null) return false
        return Timestamp.now().seconds > expiresAt.seconds
    }
}
