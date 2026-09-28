package com.example.data.sync

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Estado completo de salud y métricas internas del sistema (Fase 11).
 */
data class HealthStatus(
    val connectedUsers: Int = 0,
    val guestUsers: Int = 0,
    val onlineCouriers: Int = 0,
    val lastSyncTimestamp: Long = System.currentTimeMillis(),
    val lastSnapshotTimestamp: Long = System.currentTimeMillis(),
    val cloudFunctionsStatus: String = "OK",
    val firestoreStatus: String = "HEALTHY",
    val fcmStatus: String = "OK",
    val latencyMs: Long = 0L,
    val averageLatencyMs: Long = 0L,
    val activeListenersCount: Int = 0,
    val pendingOperationsCount: Int = 0,
    val retryCount: Int = 0,
    val authStatus: String = "LOGGED_OUT",
    val isAuthenticated: Boolean = false,
    val isNetworkConnected: Boolean = true
)

/**
 * Recolector y monitor central de salud interna y métricas de rendimiento (Fase 11).
 */
class HealthMonitor(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var heartbeatJob: Job? = null
    private var listenerRegistration: ListenerRegistration? = null

    private val _healthStatus = MutableStateFlow(HealthStatus())
    val healthStatus: StateFlow<HealthStatus> = _healthStatus.asStateFlow()

    // Historial para promedio móvil de latencia (máximo 10 muestras)
    private val latencySamples = ConcurrentLinkedQueue<Long>()

    fun start(isGuest: Boolean = false, userRole: String = "customer") {
        stop()
        if (auth.currentUser == null || isGuest) {
            Log.d("HealthMonitor", "Guest mode or unauthenticated user; skipping system_health listeners and heartbeat.")
            updateAuthStatus(
                authStatus = if (isGuest) "GUEST" else "LOGGED_OUT",
                isAuthenticated = false
            )
            return
        }

        updateAuthStatus(
            authStatus = "AUTHENTICATED",
            isAuthenticated = true
        )

        heartbeatJob = scope.launch {
            while (isActive) {
                sendHeartbeat(isGuest = false, userRole)
                delay(120_000) // Heartbeat cada 2 minutos
            }
        }
        listenToHealthStatus()
    }

    private suspend fun sendHeartbeat(isGuest: Boolean, userRole: String) {
        val uid = auth.currentUser?.uid ?: if (isGuest) "guest_${System.currentTimeMillis() / 1000}" else return
        val startTime = System.currentTimeMillis()
        val now = Timestamp.now()
        val expiresAt = Timestamp(now.seconds + 180, now.nanoseconds)

        try {
            val currentStatus = _healthStatus.value
            val sessionData = mapOf(
                "uid" to uid,
                "isGuest" to isGuest,
                "role" to userRole,
                "lastSeen" to now,
                "heartbeatAt" to now,
                "expiresAt" to expiresAt,
                "latencyMs" to (System.currentTimeMillis() - startTime),
                "activeListenersCount" to currentStatus.activeListenersCount,
                "pendingOperationsCount" to currentStatus.pendingOperationsCount,
                "online" to true
            )

            firestore.collection("system_health")
                .document("active_sessions")
                .collection("sessions")
                .document(uid)
                .set(sessionData, SetOptions.merge())

            val latency = System.currentTimeMillis() - startTime
            recordSyncEvent(latency)
            Log.d("HealthMonitor", "Heartbeat sent for $uid. Latency: ${latency}ms. AvgLatency: ${_healthStatus.value.averageLatencyMs}ms.")
        } catch (e: Exception) {
            Log.e("HealthMonitor", "Error sending heartbeat", e)
            recordRetryEvent()
            _healthStatus.value = _healthStatus.value.copy(firestoreStatus = "DEGRADED")
        }
    }

    private fun listenToHealthStatus() {
        listenerRegistration = firestore.collection("system_health")
            .document("status")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("HealthMonitor", "Error listening to system_health/status", error)
                    _healthStatus.value = _healthStatus.value.copy(firestoreStatus = "ERROR")
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    val connected = snapshot.getLong("connectedUsers")?.toInt() ?: 0
                    val guests = snapshot.getLong("guestUsers")?.toInt() ?: 0
                    val couriers = snapshot.getLong("onlineCouriers")?.toInt() ?: 0
                    val functionsStatus = snapshot.getString("cloudFunctionsStatus") ?: "OK"
                    val fcmStatus = snapshot.getString("fcmStatus") ?: "OK"
                    val lastSync = snapshot.getTimestamp("lastSyncTimestamp")?.seconds ?: (System.currentTimeMillis() / 1000)

                    _healthStatus.value = _healthStatus.value.copy(
                        connectedUsers = connected,
                        guestUsers = guests,
                        onlineCouriers = couriers,
                        cloudFunctionsStatus = functionsStatus,
                        firestoreStatus = "HEALTHY",
                        fcmStatus = fcmStatus,
                        lastSyncTimestamp = lastSync * 1000,
                        lastSnapshotTimestamp = System.currentTimeMillis()
                    )
                }
            }
    }

    /**
     * Registra un evento de sincronización recalculando el promedio móvil de latencia.
     */
    fun recordSyncEvent(latencyMs: Long) {
        latencySamples.add(latencyMs)
        while (latencySamples.size > 10) {
            latencySamples.poll()
        }
        val avg = if (latencySamples.isNotEmpty()) latencySamples.average().toLong() else latencyMs
        _healthStatus.value = _healthStatus.value.copy(
            latencyMs = latencyMs,
            averageLatencyMs = avg,
            lastSyncTimestamp = System.currentTimeMillis(),
            firestoreStatus = "HEALTHY"
        )
    }

    /**
     * Actualiza el conteo global de listeners activos.
     */
    fun updateActiveListenersCount(count: Int) {
        _healthStatus.value = _healthStatus.value.copy(activeListenersCount = count)
    }

    /**
     * Incremente el contador de reintentos acumulados.
     */
    fun recordRetryEvent() {
        val currentRetries = _healthStatus.value.retryCount
        _healthStatus.value = _healthStatus.value.copy(retryCount = currentRetries + 1)
    }

    /**
     * Actualiza el conteo de operaciones pendientes offline.
     */
    fun setPendingOperationsCount(count: Int) {
        _healthStatus.value = _healthStatus.value.copy(pendingOperationsCount = count)
    }

    /**
     * Actualiza el estado de la conectividad de red local.
     */
    fun updateNetworkStatus(isConnected: Boolean) {
        _healthStatus.value = _healthStatus.value.copy(
            isNetworkConnected = isConnected,
            firestoreStatus = if (isConnected) "HEALTHY" else "OFFLINE"
        )
    }

    /**
     * Actualiza el estado de autenticación.
     */
    fun updateAuthStatus(authStatus: String, isAuthenticated: Boolean) {
        _healthStatus.value = _healthStatus.value.copy(
            authStatus = authStatus,
            isAuthenticated = isAuthenticated
        )
    }

    fun stop() {
        Log.d("LOGOUT", "Stopping HealthMonitor...")
        heartbeatJob?.cancel()
        heartbeatJob = null
        listenerRegistration?.remove()
        listenerRegistration = null
        latencySamples.clear()
        _healthStatus.value = HealthStatus()
    }
}
