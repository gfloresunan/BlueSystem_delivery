package com.example.data.repository

import android.util.Log
import com.example.domain.model.AppNotification
import com.example.domain.model.NotificationPreferences
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * Componente 1: Notification Engine (Fase 12 Enterprise Architecture).
 * Responsable de la creación, despacho, filtrado por preferencias y registro de notificaciones.
 */
object NotificationEngine {
    private const val TAG = "NotificationEngine"
    private val db: FirebaseFirestore
        get() = FirebaseFirestore.getInstance()

    /**
     * Despacha una Notificación Operativa Automática (Pedidos, Pagos, Entregas, Chat).
     */
    suspend fun dispatchOperativeNotification(
        targetUid: String,
        title: String,
        body: String,
        type: String = "ORDER",
        category: String = "Pedidos",
        deepLink: String = "",
        priority: String = "NORMAL"
    ) {
        if (targetUid.isEmpty()) return
        try {
            // Verificar preferencias de notificación del usuario
            val prefsDoc = db.collection("users").document(targetUid).collection("settings").document("preferences").get().await()
            val prefs = prefsDoc.toObject(NotificationPreferences::class.java) ?: NotificationPreferences()

            if (!prefs.isNotificationAllowed(type, category)) {
                Log.d(TAG, "Notificación omitida para $targetUid por preferencia del usuario. Tipo: $type")
                return
            }

            val notifData = mapOf(
                "title" to title,
                "body" to body,
                "type" to type,
                "category" to category,
                "priority" to priority,
                "deepLink" to deepLink,
                "navigationRoute" to deepLink,
                "channel" to "IN_APP",
                "isRead" to false,
                "read" to false,
                "deletedByUser" to false,
                "sentAt" to Timestamp.now()
            )

            db.collection("users")
                .document(targetUid)
                .collection("notifications")
                .add(notifData)
                .await()

            Log.d(TAG, "Notificación operativa despachada con éxito a $targetUid")
        } catch (e: Exception) {
            Log.e(TAG, "Error despachando notificación operativa a $targetUid", e)
        }
    }

    /**
     * Despacha una Alerta Administrativa (Destinada únicamente a Admin, Supervisor, Operadores o Soporte).
     */
    suspend fun dispatchAdminAlert(
        title: String,
        body: String,
        type: String = "SECURITY",
        category: String = "Seguridad",
        priority: String = "HIGH",
        targetRole: String = "admin"
    ) {
        try {
            val alertData = mapOf(
                "title" to title,
                "body" to body,
                "type" to type,
                "category" to category,
                "priority" to priority,
                "targetRole" to targetRole,
                "channel" to "IN_APP",
                "sentAt" to Timestamp.now()
            )

            db.collection("admin_alerts").add(alertData).await()
            Log.d(TAG, "Alerta administrativa registrada para rol '$targetRole': $title")
        } catch (e: Exception) {
            Log.e(TAG, "Error registrando alerta administrativa", e)
        }
    }
}
