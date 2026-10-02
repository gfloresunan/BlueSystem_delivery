package com.example.data

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.example.BuildConfig
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import java.util.Locale
import java.util.UUID

/**
 * FcmManager: Encapsula el registro multi-dispositivo y sincronización atómica de Tokens FCM 
 * en las colecciones users/{uid}/devices/{deviceId} y user_devices/{uid}_{deviceId} (Fase 12 Enterprise).
 */
object FcmManager {

    fun getDeviceId(context: Context): String {
        return try {
            val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            if (!androidId.isNullOrBlank() && androidId != "9774d56d682e549c") {
                androidId
            } else {
                val prefs = context.getSharedPreferences("fcm_device_prefs", Context.MODE_PRIVATE)
                var fallbackId = prefs.getString("fallback_device_id", null)
                if (fallbackId == null) {
                    fallbackId = UUID.randomUUID().toString()
                    prefs.edit().putString("fallback_device_id", fallbackId).apply()
                }
                fallbackId
            }
        } catch (e: Exception) {
            UUID.randomUUID().toString()
        }
    }

    suspend fun registerCurrentDeviceToken(userType: String = "") {
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser

        val context = try {
            FirebaseApp.getInstance().applicationContext
        } catch (e: Exception) {
            Log.e("FcmManager", "FirebaseApp no inicializado", e)
            return
        }

        val deviceId = getDeviceId(context)
        val uid = currentUser?.uid ?: "guest_$deviceId"
        val email = currentUser?.email ?: ""
        val effectiveRole = if (userType.isNotBlank()) userType else if (currentUser == null) "guest" else "customer"

        try {
            val token = FirebaseMessaging.getInstance().token.await()
            syncDeviceTokenInternal(context, uid, email, effectiveRole, token)
        } catch (e: Exception) {
            Log.e("FcmManager", "Error al obtener o registrar token FCM", e)
        }
    }

    /**
     * Sincronización multi-dispositivo explícita con preferencias por dispositivo (Fase 12).
     */
    suspend fun syncDeviceTokenInternal(
        context: Context,
        uid: String,
        email: String,
        role: String,
        token: String
    ) {
        if (token.isBlank() || uid.isBlank()) return

        try {
            val deviceId = getDeviceId(context)
            val prefs = context.getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)
            val db = FirebaseFirestore.getInstance()

            val deviceData = hashMapOf(
                "deviceId" to deviceId,
                "uid" to uid,
                "email" to email,
                "role" to role,
                "fcmToken" to token,
                "platform" to "Android",
                "deviceType" to if (context.resources.configuration.smallestScreenWidthDp >= 600) "Tablet" else "Smartphone",
                "appVersion" to BuildConfig.VERSION_NAME,
                "model" to Build.MODEL,
                "manufacturer" to Build.MANUFACTURER,
                "androidVersion" to Build.VERSION.RELEASE,
                "language" to Locale.getDefault().language,
                "country" to Locale.getDefault().country,
                "isTokenValid" to true,
                "isActive" to true,
                "lastActiveAt" to FieldValue.serverTimestamp(),
                "lastTokenUpdate" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )

            // 1. Guardar en la sub-colección del usuario (solo si el usuario está autenticado)
            if (!uid.startsWith("guest_")) {
                try {
                    db.collection("users")
                        .document(uid)
                        .collection("devices")
                        .document(deviceId)
                        .set(deviceData, SetOptions.merge())
                        .await()
                } catch (userDocErr: Exception) {
                    Log.w("FcmManager", "No se pudo escribir en subcolección de usuario: ${userDocErr.message}")
                }
            }

            // 2. Guardar SIEMPRE en la colección global indexada de dispositivos (soporta Guest y Usuarios Registrados)
            db.collection("user_devices")
                .document("${uid}_$deviceId")
                .set(deviceData, SetOptions.merge())
                .await()

            // Guardar en SharedPreferences
            prefs.edit().apply {
                putString("fcm_token_$uid", token)
                putString("device_id_$uid", deviceId)
                apply()
            }
            Log.d("FcmManager", "Token FCM registrado exitosamente para dispositivo $deviceId del usuario $uid")

            // Suscribir a topics estándar según rol
            if (role in listOf("driver", "courier", "motorizado")) {
                FirebaseMessaging.getInstance().subscribeToTopic("available_orders")
                try {
                    val courierSnap = db.collection("couriers").document(uid).get().await()
                    val cData = courierSnap.data
                    val muni = (cData?.get("operationalMunicipalityId") ?: cData?.get("municipalityId") ?: cData?.get("city") ?: "").toString().trim().uppercase()
                    val tenant = (cData?.get("commercialTenantId") ?: cData?.get("tenantId") ?: "default").toString().trim()
                    if (muni.isNotBlank()) {
                        val fleetTopic = "fleet_${tenant.ifBlank { "default" }}_$muni"
                        FirebaseMessaging.getInstance().subscribeToTopic(fleetTopic)
                        Log.d("FcmManager", "Courier suscrito a topic municipal: $fleetTopic")
                    }
                } catch (cErr: Exception) {
                    Log.w("FcmManager", "No se pudo suscribir a topic municipal de courier: ${cErr.message}")
                }
            } else {
                val topicName = when (role) {
                    "business", "comercio" -> "business_alerts"
                    "admin", "super_admin" -> "admin_alerts"
                    else -> "customer_alerts"
                }
                FirebaseMessaging.getInstance().subscribeToTopic(topicName)
            }

        } catch (e: FirebaseFirestoreException) {
            Log.e("FcmManager", "Error Firestore al registrar token en multi-dispositivo. Código: ${e.code}", e)
        } catch (e: Exception) {
            Log.e("FcmManager", "Error al sincronizar multi-dispositivo en user_devices", e)
        }
    }

    /**
     * Desvincula el token del dispositivo al cerrar sesión, marcándolo como inactivo en Firestore.
     * Esto evita que el dispositivo continúe recibiendo notificaciones privadas del usuario saliente (P4-01).
     */
    fun unbindCurrentDeviceTokenBlocking(context: Context, uid: String) {
        if (uid.isBlank() || uid.startsWith("guest_") || uid == "none") return
        try {
            val deviceId = getDeviceId(context)
            val db = FirebaseFirestore.getInstance()
            val unbindData = hashMapOf<String, Any>(
                "uid" to uid,
                "isActive" to false,
                "tokenStatus" to "unbound_logout",
                "unbindAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )

            // 1. Desactivar en subcolección de usuario (best effort)
            try {
                val userDeviceTask = db.collection("users")
                    .document(uid)
                    .collection("devices")
                    .document(deviceId)
                    .set(unbindData, SetOptions.merge())
                com.google.android.gms.tasks.Tasks.await(userDeviceTask, 1500, java.util.concurrent.TimeUnit.MILLISECONDS)
            } catch (e: Exception) {
                Log.w("FcmManager", "No se pudo actualizar unbind en subcolección de usuario: ${e.message}")
            }

            // 2. Desactivar en colección global user_devices
            val globalDeviceTask = db.collection("user_devices")
                .document("${uid}_$deviceId")
                .set(unbindData, SetOptions.merge())
            com.google.android.gms.tasks.Tasks.await(globalDeviceTask, 2000, java.util.concurrent.TimeUnit.MILLISECONDS)

            Log.d("FcmManager", "Dispositivo $deviceId desvinculado exitosamente en logout para usuario $uid")
        } catch (e: Exception) {
            Log.e("FcmManager", "Error al desvincular dispositivo en user_devices durante logout", e)
        }
    }

    suspend fun unbindCurrentDeviceToken(context: Context, uid: String) {
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            unbindCurrentDeviceTokenBlocking(context, uid)
        }
    }
}
