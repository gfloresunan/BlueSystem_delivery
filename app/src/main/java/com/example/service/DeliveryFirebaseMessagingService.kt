package com.example.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.R
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class DeliveryFirebaseMessagingService : FirebaseMessagingService() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d("DeliveryFCM", "Message received from: ${remoteMessage.from}")

        val data = remoteMessage.data
        val action = data["action"] ?: ""
        val type = data["type"] ?: ""
        val destinationType = data["destinationType"] ?: ""
        val orderId = data["orderId"] ?: ""
        val tripId = data["tripId"] ?: ""
        val domain = data["domain"] ?: ""
        val campaignId = data["campaignId"] ?: ""
        val deepLink = data["deepLink"] ?: data["navigationRoute"] ?: data["route"] ?: ""
        val imageUrl = data["imageUrl"] ?: remoteMessage.notification?.imageUrl?.toString() ?: ""
        val entityId = data["entityId"] ?: ""
        val entityType = data["entityType"] ?: ""
        val businessId = data["businessId"] ?: ""
        val productId = data["productId"] ?: ""
        val couponId = data["couponId"] ?: ""
        val supportConversationId = data["supportConversationId"] ?: ""

        val title = data["title"] ?: remoteMessage.notification?.title ?: "BlueSystem Delivery"
        val body  = data["body"]  ?: remoteMessage.notification?.body  ?: "Tienes una nueva actualización."

        com.example.domain.engine.courier.CourierDebugCounters.fcmReceived.incrementAndGet()

        val messageId = data["messageId"] ?: ""
        val destinationRoute = data["destinationRoute"] ?: data["navigationRoute"] ?: ""
        val conversationId = tripId.ifBlank { orderId }

        // Deduplicación universal por campaignId, conversación o acción en ventana de 60 segundos
        val eventKey = when {
            campaignId.isNotBlank() -> "CAMPAIGN_$campaignId"
            (action == "ORDER_CHAT_MESSAGE" || action == "TRIP_CHAT_MESSAGE") && messageId.isNotBlank() -> "${action}_${conversationId}_$messageId"
            conversationId.isNotBlank() -> "${action}_$conversationId"
            else -> "${action}_${title.hashCode()}_${body.hashCode()}"
        }
        val now = System.currentTimeMillis()
        val lastProcessed = recentFcmEvents[eventKey] ?: 0L
        if ((now - lastProcessed) < 60000L) {
            Log.d("DeliveryFCM", "DUPLICATE_FCM_SKIPPED | Key: $eventKey | Time elapsed: ${now - lastProcessed}ms")
            return
        }
        recentFcmEvents[eventKey] = now

        Log.d("DeliveryFCM", "Payload: Action=$action, Type=$type, DestType=$destinationType, OrderId=$orderId, TripId=$tripId, Domain=$domain, CampaignId=$campaignId, Title=$title")

        val isIncomingOrder = action in listOf("NEW_ORDER", "NEW_X_TO_Y_DELIVERY", "NEW_DELIVERY_OFFER")
        val currentUid = FirebaseAuth.getInstance().currentUser?.uid ?: ""

        if (isIncomingOrder && currentUid.isNotBlank()) {
            try {
                val balanceSnap = com.google.android.gms.tasks.Tasks.await(
                    FirebaseFirestore.getInstance()
                        .collection("courier_balances")
                        .document(currentUid)
                        .get(com.google.firebase.firestore.Source.CACHE),
                    1000,
                    java.util.concurrent.TimeUnit.MILLISECONDS
                )
                if (balanceSnap != null && balanceSnap.exists()) {
                    val canReceive = balanceSnap.getBoolean("canReceiveNewOrders") ?: true
                    val state = balanceSnap.getString("financialAccessState") ?: "ALLOW"
                    val cash = balanceSnap.getLong("cashOutstandingCents") ?: 0L
                    val limit = balanceSnap.getLong("effectiveCashLimitCents")
                        ?: balanceSnap.getLong("cashLimitCents")
                        ?: 200000L
                    val hasOverdue = balanceSnap.getBoolean("hasOverdueClosure") ?: false

                    if (!canReceive || state.startsWith("BLOCKED") || hasOverdue || (limit > 0 && cash >= limit)) {
                        Log.w("DeliveryFCM", "SUPPRESSED_INCOMING_ORDER_FCM | Courier $currentUid is financially blocked (state=$state, cash=$cash, limit=$limit, overdue=$hasOverdue). Dropping alarm.")
                        return
                    }
                }
            } catch (e: Exception) {
                Log.d("DeliveryFCM", "Cache balance check bypassed or timeout: ${e.message}")
            }
        }

        sendNotification(
            title = title,
            body = body,
            action = action,
            orderId = orderId,
            campaignId = campaignId,
            destinationRoute = destinationRoute,
            deepLink = deepLink,
            tripId = tripId,
            domain = domain,
            type = type,
            destinationType = destinationType,
            imageUrl = imageUrl,
            entityId = entityId,
            entityType = entityType,
            businessId = businessId,
            productId = productId,
            couponId = couponId,
            supportConversationId = supportConversationId
        )
    }

    private fun sendNotification(
        title: String,
        body: String,
        action: String?,
        orderId: String,
        campaignId: String = "",
        destinationRoute: String = "",
        deepLink: String = "",
        tripId: String = "",
        domain: String = "",
        type: String = "",
        destinationType: String = "",
        imageUrl: String = "",
        entityId: String = "",
        entityType: String = "",
        businessId: String = "",
        productId: String = "",
        couponId: String = "",
        supportConversationId: String = ""
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val conversationId = tripId.ifBlank { orderId }
        val notificationId = if (campaignId.isNotBlank()) campaignId.hashCode() else if (conversationId.isNotBlank()) conversationId.hashCode() else System.currentTimeMillis().toInt()

        val isIncomingOrder = action in listOf("NEW_ORDER", "NEW_X_TO_Y_DELIVERY", "NEW_DELIVERY_OFFER")

        // Use alarm channel for incoming offers/assignments (highest priority alert).
        // Use status channel for all other actions (ORDER_STATUS, PAYMENT_REJECTED, etc.)
        val channelToUse = if (isIncomingOrder) CHANNEL_ALARM_V3_ID else CHANNEL_STATUS_ID

        // Main intent: opens MainActivity with deep-link extras
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("orderId", orderId)
            putExtra("tripId", tripId)
            putExtra("domain", domain)
            putExtra("action", action)
            putExtra("type", type)
            putExtra("destinationType", destinationType)
            putExtra("destinationRoute", destinationRoute.ifBlank { deepLink })
            putExtra("navigationRoute", destinationRoute.ifBlank { deepLink })
            putExtra("entityId", entityId)
            putExtra("entityType", entityType)
            putExtra("businessId", businessId)
            putExtra("productId", productId)
            putExtra("couponId", couponId)
            putExtra("supportConversationId", supportConversationId)
            putExtra("campaignId", campaignId)
            putExtra("deepLink", deepLink)
            putExtra("imageUrl", imageUrl)
            putExtra("notificationId", if (campaignId.isNotBlank()) campaignId else conversationId)
            putExtra("readSource", "system_tray")
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // FullScreenIntent: shows notification as overlay even on lockscreen.
        // Required permission: USE_FULL_SCREEN_INTENT (declared in Manifest).
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            notificationId + 100,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationBuilder = NotificationCompat.Builder(this, channelToUse)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(pendingIntent)
            .setCategory(
                if (isIncomingOrder) NotificationCompat.CATEGORY_CALL
                else NotificationCompat.CATEGORY_STATUS
            )

        // Rich Image Media Support (BigPictureStyle)
        if (imageUrl.isNotBlank()) {
            val bitmap = downloadBitmap(imageUrl)
            if (bitmap != null) {
                notificationBuilder.setLargeIcon(bitmap)
                val bigPictureStyle = NotificationCompat.BigPictureStyle()
                    .bigPicture(bitmap)
                    .bigLargeIcon(null as android.graphics.Bitmap?)
                    .setBigContentTitle(title)
                    .setSummaryText(body)
                notificationBuilder.setStyle(bigPictureStyle)
            }
        }

        // Overlay on lockscreen for incoming orders
        if (isIncomingOrder) {
            notificationBuilder.setFullScreenIntent(fullScreenPendingIntent, true)
        }

        val currentUid = FirebaseAuth.getInstance().currentUser?.uid ?: ""

        // Action buttons: for incoming order/encomienda notifications
        if (isIncomingOrder && orderId.isNotBlank()) {
            val acceptIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                setAction("com.example.ACTION_ACCEPT")
                putExtra("orderId", orderId)
                putExtra("notificationId", notificationId)
                putExtra("currentUserId", currentUid)
            }
            val acceptPendingIntent = PendingIntent.getBroadcast(
                this, notificationId + 1, acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val rejectIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                setAction("com.example.ACTION_REJECT")
                putExtra("orderId", orderId)
                putExtra("notificationId", notificationId)
                putExtra("currentUserId", currentUid)
            }
            val rejectPendingIntent = PendingIntent.getBroadcast(
                this, notificationId + 2, rejectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            notificationBuilder
                .addAction(android.R.drawable.ic_menu_save, "ACEPTAR", acceptPendingIntent)
                .addAction(android.R.drawable.ic_delete, "RECHAZAR", rejectPendingIntent)
        }

        notificationManager.notify(notificationId, notificationBuilder.build())
    }

    @Suppress("DEPRECATION")
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("DeliveryFCM", "Nuevo token FCM generado: $token")
        
        val user = FirebaseAuth.getInstance().currentUser
        val prefs = getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)

        if (user != null) {
            val db = FirebaseFirestore.getInstance()
            val deviceId = com.example.data.FcmManager.getDeviceId(this)
            val updates = hashMapOf<String, Any>(
                "uid" to user.uid,
                "deviceId" to deviceId,
                "fcmToken" to token,
                "isActive" to true,
                "lastTokenUpdate" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )
            db.collection("user_devices").document("${user.uid}_$deviceId")
                .set(updates, com.google.firebase.firestore.SetOptions.merge())
                .addOnSuccessListener {
                    Log.d("DeliveryFCM", "Token FCM actualizado en user_devices/${user.uid}_$deviceId")
                    prefs.edit().putString("fcm_token_${user.uid}", token).apply()
                }
                .addOnFailureListener {
                    prefs.edit().putString("pending_fcm_token", token).apply()
                    Log.w("DeliveryFCM", "Error actualizando token, cacheado como pendiente.")
                }
        } else {
            prefs.edit().putString("pending_fcm_token", token).apply()
            Log.d("DeliveryFCM", "Sin usuario autenticado. Token cacheado como pendiente.")
        }
    }

    private fun downloadBitmap(urlStr: String): android.graphics.Bitmap? {
        if (urlStr.isBlank()) return null
        return try {
            var currentUrl = urlStr
            var connection: java.net.HttpURLConnection? = null
            var redirects = 0
            while (redirects < 3) {
                val url = java.net.URL(currentUrl)
                connection = url.openConnection() as java.net.HttpURLConnection
                connection.doInput = true
                connection.instanceFollowRedirects = true
                connection.connectTimeout = 8000
                connection.readTimeout = 8000
                connection.setRequestProperty("User-Agent", "BlueSystem-Android/2.2")
                connection.connect()

                val responseCode = connection.responseCode
                if (responseCode in 301..308) {
                    val location = connection.getHeaderField("Location")
                    if (!location.isNullOrBlank()) {
                        currentUrl = location
                        redirects++
                        continue
                    }
                }
                break
            }
            if (connection == null) return null
            val bytes = connection.inputStream.use { it.readBytes() }
            if (bytes.isNotEmpty()) {
                android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.w("DeliveryFCM", "No se pudo descargar imagen de notificación: ${e.message}")
            null
        }
    }

    private fun createNotificationChannels() {
        createNotificationChannels(this)
    }

    companion object {
        private val recentFcmEvents = java.util.concurrent.ConcurrentHashMap<String, Long>()

        /** Canal v3 controlado para pedidos nuevos */
        const val CHANNEL_ALARM_V3_ID = "new_orders_channel_v3"
        /** Canal de alarma para pedidos nuevos (legacy v2) */
        const val CHANNEL_ALARM_ID = "new_orders_channel_v2"
        /** Canal estándar para actualizaciones de estado */
        const val CHANNEL_STATUS_ID = "order_status_channel"
        /** Canal legacy — mantenido por compatibilidad, no usar en nuevas instalaciones */
        const val CHANNEL_LEGACY_ID = "new_orders_channel"

        /**
         * Inicializa de forma idempotente todos los canales de notificación en el sistema Android (API 26+)
         */
        fun createNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                // ─── CANAL ALARMA: Para pedidos nuevos (NEW_ORDER) ───
                val alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                val alarmAudioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build()

                val alarmChannel = NotificationChannel(
                    CHANNEL_ALARM_ID,
                    "Pedidos Nuevos (Alarma)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alertas de pedidos entrantes — prioridad máxima operativa"
                    enableLights(true)
                    lightColor = android.graphics.Color.RED
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)
                    setSound(alarmSoundUri, alarmAudioAttributes)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                }

                // ─── CANAL STATUS: Para cambios de estado (ORDER_STATUS, PAYMENT, CAMPAIGNS, etc.) ───
                val notifSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val notifAudioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()

                val statusChannel = NotificationChannel(
                    CHANNEL_STATUS_ID,
                    "Actualizaciones de Pedidos y Notificaciones",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Estado de pedidos, pagos, entregas y promociones"
                    enableVibration(true)
                    setSound(notifSoundUri, notifAudioAttributes)
                }

                // ─── CANAL LEGACY (v1): Mantenido para compatibilidad ───
                val legacyChannel = NotificationChannel(
                    CHANNEL_LEGACY_ID,
                    "Nuevos Pedidos (Legacy)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Canal heredado — no usar en nuevas instalaciones"
                }

                val alarmChannelV3 = NotificationChannel(
                    CHANNEL_ALARM_V3_ID,
                    "Pedidos Nuevos (Fase 3 Controlled Alert)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alertas de pedidos entrantes de la flota — canal controlado v3"
                    enableLights(true)
                    lightColor = android.graphics.Color.GREEN
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 300, 150, 300)
                    setSound(alarmSoundUri, alarmAudioAttributes)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                }

                notificationManager.createNotificationChannels(
                    listOf(alarmChannel, alarmChannelV3, statusChannel, legacyChannel)
                )
                Log.d("DeliveryFCM", "Canales de notificación registrados globalmente: $CHANNEL_ALARM_V3_ID, $CHANNEL_ALARM_ID, $CHANNEL_STATUS_ID")
            }
        }
    }
}
