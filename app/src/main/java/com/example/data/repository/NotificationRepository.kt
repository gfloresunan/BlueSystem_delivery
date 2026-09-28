package com.example.data.repository

import android.util.Log
import com.example.domain.model.AppNotification
import com.example.domain.model.NotificationPreferences
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Repositorio unificado de notificaciones empresariales (Fase 12: Notification Center Enterprise).
 * Gestiona la escucha en tiempo real, tracking de aperturas/botones y el Centro de Preferencias de Notificaciones.
 */
class NotificationRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    private val _userPreferences = MutableStateFlow(NotificationPreferences())
    val userPreferences: StateFlow<NotificationPreferences> = _userPreferences.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null
    private var currentUid: String = ""

    fun startListening(uid: String) {
        if (uid.isEmpty()) return
        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        if (currentUser == null || currentUser.uid != uid) {
            Log.d("NotificationRepo", "Skipping private listener. Guest mode or user mismatch.")
            return
        }
        if (listenerRegistration != null && currentUid == uid) return
        stopListening()
        currentUid = uid

        // Cargar preferencias del usuario al iniciar escucha
        CoroutineScope(Dispatchers.IO).launch {
            loadUserPreferences(uid)
        }

        listenerRegistration = firestore.collection("users")
            .document(uid)
            .collection("notifications")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("NotificationRepo", "Error listening to user notifications", error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val prefs = _userPreferences.value
                    val list = snapshot.documents.mapNotNull { doc ->
                        try {
                            doc.toObject(AppNotification::class.java)?.copy(id = doc.id)
                        } catch (e: Exception) {
                            Log.w("NotificationRepo", "Error deserializing notification ${doc.id}: ${e.message}")
                            null
                        }
                    }.filter { notif ->
                        notif.isVisibleToUser() && 
                        prefs.isNotificationAllowed(notif.type, notif.category)
                    }.sortedByDescending { it.sentAt }

                    _notifications.value = list
                    _unreadCount.value = list.count { !it.getEffectiveIsRead() }
                    Log.d("NotificationRepo", "Notificaciones filtradas para $uid: total=${list.size}, unread=${_unreadCount.value}")
                }
            }
    }

    /**
     * Carga el Centro de Preferencias de Notificaciones del Usuario (Fase 12).
     */
    suspend fun loadUserPreferences(uid: String): NotificationPreferences {
        if (uid.isEmpty()) return NotificationPreferences()
        return try {
            val doc = firestore.collection("users")
                .document(uid)
                .collection("settings")
                .document("preferences")
                .get()
                .await()
            val prefs = doc.toObject(NotificationPreferences::class.java) ?: NotificationPreferences()
            _userPreferences.value = prefs
            prefs
        } catch (e: Exception) {
            Log.e("NotificationRepo", "Error cargando preferencias de notificaciones para $uid", e)
            NotificationPreferences()
        }
    }

    /**
     * Guarda la configuración del Centro de Preferencias de Notificaciones (Fase 12).
     */
    suspend fun saveUserPreferences(uid: String, preferences: NotificationPreferences) {
        if (uid.isEmpty()) return
        try {
            firestore.collection("users")
                .document(uid)
                .collection("settings")
                .document("preferences")
                .set(preferences)
                .await()
            _userPreferences.value = preferences
            Log.d("NotificationRepo", "Preferencias de notificaciones guardadas exitosamente para $uid")
        } catch (e: Exception) {
            Log.e("NotificationRepo", "Error guardando preferencias de notificaciones", e)
        }
    }

    suspend fun markAsRead(notificationId: String, readSource: String = "in_app") {
        val targetUid = if (currentUid.isNotEmpty()) currentUid else (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "")
        if (targetUid.isEmpty() || notificationId.isEmpty()) return
        try {
            val updates = mapOf(
                "isRead" to true,
                "read" to true,
                "readAt" to Timestamp.now(),
                "readSource" to readSource,
                "readByUid" to targetUid
            )
            firestore.collection("users")
                .document(targetUid)
                .collection("notifications")
                .document(notificationId)
                .update(updates)
                .await()
        } catch (e: Exception) {
            Log.e("NotificationRepo", "Error marcando notificación $notificationId como leída desde $readSource", e)
        }
    }

    /**
     * Registra el evento de apertura de notificación e incrementa analíticas de campaña (Fase 12).
     */
    fun trackNotificationOpened(notificationId: String, campaignId: String? = null, readSource: String = "in_app") {
        val targetUid = if (currentUid.isNotEmpty()) currentUid else (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "")
        if (targetUid.isEmpty() || notificationId.isEmpty()) return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val now = Timestamp.now()
                val updates = mapOf(
                    "isRead" to true,
                    "read" to true,
                    "readAt" to now,
                    "openedAt" to now,
                    "openCount" to FieldValue.increment(1),
                    "readSource" to readSource,
                    "readByUid" to targetUid
                )
                firestore.collection("users")
                    .document(targetUid)
                    .collection("notifications")
                    .document(notificationId)
                    .update(updates)
                    .await()

                if (!campaignId.isNullOrEmpty()) {
                    updateCampaignAnalytics(campaignId, "openedCount")
                }
            } catch (e: Exception) {
                Log.e("NotificationRepo", "Error al registrar apertura de notificación $notificationId", e)
            }
        }
    }

    /**
     * Registra la interacción con botones interactivos e incrementa el CTR por botón (Fase 12).
     */
    fun trackButtonClicked(notificationId: String, buttonId: String, buttonLabel: String, campaignId: String? = null) {
        if (currentUid.isEmpty() || notificationId.isEmpty()) return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val now = Timestamp.now()
                val updates = mapOf(
                    "isRead" to true,
                    "read" to true,
                    "clickedAt" to now,
                    "lastButtonPressed" to buttonLabel
                )
                firestore.collection("users")
                    .document(currentUid)
                    .collection("notifications")
                    .document(notificationId)
                    .update(updates)
                    .await()

                if (!campaignId.isNullOrEmpty()) {
                    updateCampaignAnalytics(campaignId, "buttonClicks")
                }
            } catch (e: Exception) {
                Log.e("NotificationRepo", "Error al registrar clic en botón para $notificationId", e)
            }
        }
    }

    /**
     * Registra la conversión (compra/pedido originado desde una campaña) en las métricas de Firestore (Fase 12).
     */
    fun trackConversion(campaignId: String, orderId: String, amount: Double) {
        if (campaignId.isEmpty()) return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val updates = mapOf(
                    "analytics.conversionCount" to FieldValue.increment(1),
                    "analytics.conversionValue" to FieldValue.increment(amount),
                    "analytics.lastConversion" to Timestamp.now()
                )
                firestore.collection("notification_campaigns")
                    .document(campaignId)
                    .update(updates)
                    .await()
                Log.d("NotificationRepo", "Conversión registrada con éxito para la campaña $campaignId: Pedido $orderId, Valor C$ $amount")
            } catch (e: Exception) {
                Log.e("NotificationRepo", "Error al registrar conversión de campaña $campaignId", e)
            }
        }
    }

    suspend fun markAllAsRead() {
        if (currentUid.isEmpty()) return
        try {
            val unreadDocs = _notifications.value.filter { !it.getEffectiveIsRead() }
            val batch = firestore.batch()
            for (item in unreadDocs) {
                val ref = firestore.collection("users")
                    .document(currentUid)
                    .collection("notifications")
                    .document(item.id)
                batch.update(ref, mapOf("isRead" to true, "read" to true, "readAt" to Timestamp.now()))
            }
            batch.commit().await()
            Log.d("NotificationRepo", "Marcadas todas las notificaciones como leídas para $currentUid")
        } catch (e: Exception) {
            Log.e("NotificationRepo", "Error marcando todas como leídas", e)
        }
    }

    suspend fun deleteNotification(notificationId: String, campaignId: String? = null) {
        if (currentUid.isEmpty() || notificationId.isEmpty()) return
        try {
            firestore.collection("users")
                .document(currentUid)
                .collection("notifications")
                .document(notificationId)
                .update("deletedByUser", true)
                .await()
            
            if (!campaignId.isNullOrEmpty()) {
                updateCampaignAnalytics(campaignId, "deletedCount")
            }
            Log.d("NotificationRepo", "Notificación $notificationId ocultada para el usuario $currentUid")
        } catch (e: Exception) {
            Log.e("NotificationRepo", "Error eliminando notificación $notificationId", e)
        }
    }

    private fun updateCampaignAnalytics(campaignId: String, metricName: String) {
        try {
            firestore.collection("notification_campaigns")
                .document(campaignId)
                .update(
                    "analytics.$metricName", FieldValue.increment(1),
                    "analytics.lastInteraction", Timestamp.now()
                )
        } catch (e: Exception) {
            Log.e("NotificationRepo", "Error actualizando métrica $metricName en campaña $campaignId", e)
        }
    }

    fun stopListening(): Boolean {
        val hadListener = listenerRegistration != null
        Log.d("LOGOUT", "Stopping NotificationRepo...")
        listenerRegistration?.remove()
        listenerRegistration = null
        _notifications.value = emptyList()
        _unreadCount.value = 0
        currentUid = ""
        return hadListener
    }
}
