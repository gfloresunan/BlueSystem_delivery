package com.example.data

import com.example.domain.model.AppNotification

/**
 * Gestor del Centro de Notificaciones In-App existente (UI Oficial).
 */
object NotificationCenterManager {

    private val notificationsList = mutableListOf<AppNotification>()

    fun addNotification(
        userId: String,
        title: String,
        body: String,
        type: String = "SYSTEM",
        metadata: Map<String, Any> = emptyMap()
    ) {
        val notif = AppNotification(
            id = "notif_${System.currentTimeMillis()}_${(1000..9999).random()}",
            targetRole = userId,
            title = title,
            body = body,
            type = type,
            isRead = false
        )
        notificationsList.add(notif)
    }

    fun getUnreadNotifications(userId: String): List<AppNotification> {
        return notificationsList.filter { (it.targetRole == userId || it.targetRole.isEmpty()) && !it.getEffectiveIsRead() }
    }

    fun getAllNotifications(userId: String): List<AppNotification> {
        return notificationsList.filter { it.targetRole == userId || it.targetRole.isEmpty() }
    }

    fun clear() {
        notificationsList.clear()
    }
}
