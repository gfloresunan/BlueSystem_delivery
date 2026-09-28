package com.example.data.sync

import android.content.Context
import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

data class SyncMetrics(
    val lastDeltaSyncDurationMs: Long = 0L,
    val syncedDocumentsCount: Int = 0,
    val pendingSyncItemsCount: Int = 0,
    val lastSyncError: String? = null,
    val retryCount: Int = 0
)

class PendingSyncManager(
    private val context: Context,
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val prefs = context.getSharedPreferences("bluesystem_sync_prefs", Context.MODE_PRIVATE)

    private val _syncMetrics = MutableStateFlow(SyncMetrics())
    val syncMetrics: StateFlow<SyncMetrics> = _syncMetrics.asStateFlow()

    // Timestamps per domain
    fun getDomainLastSync(domain: String): Long {
        return prefs.getLong("sync_ts_$domain", System.currentTimeMillis() - (24 * 60 * 60 * 1000))
    }

    fun setDomainLastSync(domain: String, timestamp: Long) {
        prefs.edit().putLong("sync_ts_$domain", timestamp).apply()
    }

    /**
     * Re-sincronización delta granular por colección
     */
    suspend fun performGranularDeltaSync(uid: String) {
        val startMs = System.currentTimeMillis()
        var totalSyncedDocs = 0
        var currentError: String? = null
        var retries = _syncMetrics.value.retryCount

        try {
            // 1. Config Delta
            totalSyncedDocs += syncCollectionDelta("config", "system_config", "lastUpdate")

            // 2. Banners Delta
            totalSyncedDocs += syncCollectionDelta("banner", "banners", "updatedAt")

            // 3. Categories Delta
            totalSyncedDocs += syncCollectionDelta("category", "categories", "updatedAt")

            // 4. Promotions Delta
            totalSyncedDocs += syncCollectionDelta("promotion", "promotions", "updatedAt")

            // 5. Coupons Delta
            totalSyncedDocs += syncCollectionDelta("coupon", "coupons", "updatedAt")

            // 6. Business Delta
            totalSyncedDocs += syncCollectionDelta("business", "businesses", "updatedAt")

            // 7. Notifications Delta
            if (uid.isNotEmpty()) {
                val notifTs = getDomainLastSync("notification")
                val notifTsObj = Timestamp(notifTs / 1000, 0)
                val notifSnap = firestore.collection("users")
                    .document(uid)
                    .collection("notifications")
                    .whereGreaterThan("sentAt", notifTsObj)
                    .get()
                    .await()
                totalSyncedDocs += notifSnap.size()
                setDomainLastSync("notification", System.currentTimeMillis())
            }

            val durationMs = System.currentTimeMillis() - startMs
            _syncMetrics.value = SyncMetrics(
                lastDeltaSyncDurationMs = durationMs,
                syncedDocumentsCount = totalSyncedDocs,
                pendingSyncItemsCount = 0,
                lastSyncError = null,
                retryCount = 0
            )
            Log.d("PendingSyncManager", "Granular delta sync completed in ${durationMs}ms. Docs synced: $totalSyncedDocs")
        } catch (e: Exception) {
            currentError = e.message
            retries++
            val durationMs = System.currentTimeMillis() - startMs
            _syncMetrics.value = SyncMetrics(
                lastDeltaSyncDurationMs = durationMs,
                syncedDocumentsCount = totalSyncedDocs,
                pendingSyncItemsCount = 1,
                lastSyncError = currentError,
                retryCount = retries
            )
            Log.e("PendingSyncManager", "Granular delta sync failed after ${durationMs}ms", e)
        }
    }

    private suspend fun syncCollectionDelta(domain: String, collectionPath: String, timeField: String): Int {
        val lastTs = getDomainLastSync(domain)
        val timestampObj = Timestamp(lastTs / 1000, 0)
        return try {
            val snap = firestore.collection(collectionPath)
                .whereGreaterThan(timeField, timestampObj)
                .get()
                .await()
            setDomainLastSync(domain, System.currentTimeMillis())
            Log.d("PendingSyncManager", "[$domain] synced ${snap.size()} updated documents.")
            snap.size()
        } catch (e: Exception) {
            Log.w("PendingSyncManager", "Failed to sync domain $domain: ${e.message}")
            0
        }
    }
}
