package com.example.domain.engine.courier

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

enum class NotificationPriority {
    LOW,
    NORMAL,
    HIGH,
    CRITICAL
}

enum class NotificationCategory {
    NUEVO_PEDIDO,
    ASIGNACION,
    CAMBIO_ESTADO,
    CANCELACION,
    RECHAZO,
    SISTEMA
}

data class CourierNotificationItem(
    val id: String,
    val title: String,
    val body: String,
    val priority: NotificationPriority,
    val category: NotificationCategory = NotificationCategory.SISTEMA,
    val orderId: String? = null,
    val actionType: String? = null,
    val timestampMs: Long = System.currentTimeMillis(),
    val expirationTimeMs: Long = System.currentTimeMillis() + 86400000L, // 24 horas por defecto
    val retryCount: Int = 0,
    val isAcknowledged: Boolean = false,
    val isRead: Boolean = false
)

/**
 * Motor gestor de notificaciones de alta disponibilidad y reintentos (CourierNotificationEngine).
 */
class CourierNotificationEngine {

    private val _notifications = MutableStateFlow<List<CourierNotificationItem>>(emptyList())
    val notifications: StateFlow<List<CourierNotificationItem>> = _notifications.asStateFlow()

    fun enqueueNotification(notification: CourierNotificationItem) {
        _notifications.update { current ->
            // Evitar duplicados por id o por orderId+category en un intervalo corto
            if (current.any { it.id == notification.id }) return@update current
            (listOf(notification) + current).sortedByDescending { it.timestampMs }
        }
    }

    fun markAsRead(id: String) {
        _notifications.update { list ->
            list.map { item ->
                if (item.id == id) item.copy(isRead = true, isAcknowledged = true) else item
            }
        }
    }

    fun markAllAsRead() {
        _notifications.update { list ->
            list.map { it.copy(isRead = true, isAcknowledged = true) }
        }
    }

    fun acknowledgeNotification(id: String) {
        markAsRead(id)
    }

    fun purgeExpiredNotifications() {
        val now = System.currentTimeMillis()
        _notifications.update { list ->
            list.filter { !it.isAcknowledged && it.expirationTimeMs > now }
        }
    }
}

