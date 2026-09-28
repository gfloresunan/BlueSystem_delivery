package com.example.data.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.work.*
import com.example.data.local.dao.OfflineOrderDao
import com.example.data.local.dao.PendingActionDao
import com.example.data.local.entity.PendingActionEntity
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit
import org.json.JSONObject

class SyncManager(
    private val context: Context,
    private val pendingActionDao: PendingActionDao,
    private val offlineOrderDao: OfflineOrderDao,
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    val isOnline: StateFlow<Boolean> = callbackFlow {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: android.net.Network) {
                trySend(true)
            }
            override fun onLost(network: android.net.Network) {
                trySend(false)
            }
        }
        
        connectivityManager.registerDefaultNetworkCallback(callback)
        
        val currentNetwork = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(currentNetwork)
        trySend(capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true)
        
        awaitClose {
            connectivityManager.unregisterNetworkCallback(callback)
        }
    }.stateIn(scope, SharingStarted.Eagerly, false)
    
    val pendingActionsCount: Flow<Int> = pendingActionDao.getPendingCount()
    
    init {
        scope.launch {
            isOnline.collect { online ->
                if (online) {
                    syncPendingActions()
                }
            }
        }
    }
    
    suspend fun queueAction(
        orderId: String,
        actionType: String,
        payload: Map<String, Any>
    ) {
        val jsonPayload = JSONObject(payload).toString()
        val action = PendingActionEntity(
            orderId = orderId,
            actionType = actionType,
            payload = jsonPayload
        )
        pendingActionDao.insert(action)
        
        if (isOnline.value) {
            syncPendingActions()
        } else {
            scheduleSyncWork()
        }
    }
    
    suspend fun syncPendingActions() {
        val pending = pendingActionDao.getPendingActionsSync()
        
        for (action in pending) {
            try {
                pendingActionDao.update(action.copy(status = "SYNCING"))
                
                val success = when (action.actionType) {
                    "UPDATE_STATUS" -> syncStatusUpdate(action)
                    "UPDATE_LOCATION" -> syncLocationUpdate(action)
                    else -> false
                }
                
                if (success) {
                    pendingActionDao.delete(action)
                } else {
                    pendingActionDao.update(
                        action.copy(
                            status = "PENDING",
                            retryCount = action.retryCount + 1,
                            lastError = "Sync failed"
                        )
                    )
                }
            } catch (e: Exception) {
                pendingActionDao.update(
                    action.copy(
                        status = if (action.retryCount >= 3) "FAILED" else "PENDING",
                        retryCount = action.retryCount + 1,
                        lastError = e.message
                    )
                )
            }
        }
    }
    
    private suspend fun syncStatusUpdate(action: PendingActionEntity): Boolean {
        val payload = parsePayload(action.payload)
        val orderId = action.orderId
        val newStatus = payload.optString("status")
        if (newStatus.isEmpty()) return false
        
        val courierPhase = if (payload.has("courierPhase")) payload.getInt("courierPhase") else null
        
        val firestoreDoc = firestore.collection("orders").document(orderId).get().await()
        val currentStatus = firestoreDoc.getString("status")
        
        if (isStatusMoreAdvanced(currentStatus, newStatus)) {
            return true 
        }
        
        val updates = mutableMapOf<String, Any>(
            "status" to newStatus,
            "updatedAt" to com.google.firebase.Timestamp.now()
        )
        courierPhase?.let { updates["courierPhase"] = it }
        if (payload.has("cashReceived")) {
            updates["cashReceived"] = payload.getDouble("cashReceived")
        }
        if (payload.has("changeGiven")) {
            updates["changeGiven"] = payload.getDouble("changeGiven")
        }
        
        firestore.collection("orders").document(orderId).update(updates).await()
        return true
    }
    
    private suspend fun syncLocationUpdate(action: PendingActionEntity): Boolean {
        val payload = parsePayload(action.payload)
        val orderId = action.orderId
        if (!payload.has("latitude") || !payload.has("longitude")) return false
        
        val lat = payload.getDouble("latitude")
        val lng = payload.getDouble("longitude")
        
        firestore.collection("orders").document(orderId)
            .update(
                mapOf(
                    "courierLocation" to mapOf("lat" to lat, "lng" to lng),
                    "lastLocationUpdate" to com.google.firebase.Timestamp.now()
                )
            ).await()
        return true
    }
    
    private fun isStatusMoreAdvanced(current: String?, new: String): Boolean {
        val hierarchy = listOf("pending", "payment_verifying", "preparing", "ready", "in_transit", "delivered", "cancelled")
        val currentIndex = hierarchy.indexOf(current)
        val newIndex = hierarchy.indexOf(new)
        return currentIndex > newIndex
    }
    
    private fun parsePayload(payloadJson: String): JSONObject {
        return JSONObject(payloadJson)
    }
    
    private fun scheduleSyncWork() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val syncWork = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        
        WorkManager.getInstance(context).enqueueUniqueWork(
            "sync_pending_actions",
            ExistingWorkPolicy.KEEP,
            syncWork
        )
    }
}
