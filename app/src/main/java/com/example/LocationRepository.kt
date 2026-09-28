package com.example

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class LocationRepository(private val context: Context) {
    private val firebaseManager = FirebaseManager()
    private val dao = AppDatabase.getDatabase(context).offlineLocationDao()

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    suspend fun updateLocation(
        motorizadoId: String,
        lat: Double,
        lng: Double,
        pedidoActivoId: String? = null,
        destinoLat: Double? = null,
        destinoLng: Double? = null
    ) {
        if (isNetworkAvailable()) {
            // Intenta subir directo
            try {
                firebaseManager.updateCourierLocation(
                    motorizadoId, lat, lng, pedidoActivoId, destinoLat, destinoLng
                )
                
                // Si la red volvió y hay pendientes en local, disparamos el worker
                if (dao.getPendingCount() > 0) {
                    triggerSyncWorker()
                }
            } catch (e: Exception) {
                // Fallback por si acaso falló
                saveOffline(motorizadoId, lat, lng)
            }
        } else {
            saveOffline(motorizadoId, lat, lng)
        }
    }

    private suspend fun saveOffline(motorizadoId: String, lat: Double, lng: Double) {
        val entity = OfflineLocationEntity(
            motorizadoId = motorizadoId,
            latitud = lat,
            longitud = lng,
            timestamp = System.currentTimeMillis()
        )
        dao.insertLocation(entity)
        triggerSyncWorker()
    }

    private fun triggerSyncWorker() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<LocationSyncWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "LocationSyncWork",
            ExistingWorkPolicy.REPLACE,
            syncWorkRequest
        )
    }
}
