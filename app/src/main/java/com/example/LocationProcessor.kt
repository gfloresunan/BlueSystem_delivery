package com.example

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.lang.System.currentTimeMillis

class LocationProcessor(
    private val context: Context,
    private val firebaseManager: FirebaseManager,
    private val locationDao: OfflineLocationDao
) {

    suspend fun processNewLocation(motorizadoId: String, lat: Double, lng: Double) {
        val timestamp = currentTimeMillis()

        if (isNetworkAvailable()) {
            // Envío directo a Firestore si hay red
            // Asegúrate de que el método updateCourierLocation esté implementado en tu FirebaseManager
            firebaseManager.updateCourierLocation(motorizadoId, lat, lng)
            
            // Si había datos acumulados previamente en Room, disparamos el sync inmediatamente
            if (locationDao.getPendingCount() > 0) {
                enqueueSyncWorker()
            }
        } else {
            // Guardado local preventivo en Room si el repartidor está offline
            val offlineLoc = OfflineLocationEntity(
                motorizadoId = motorizadoId,
                latitud = lat,
                longitud = lng,
                timestamp = timestamp
            )
            locationDao.insertLocation(offlineLoc)
            
            // Registramos la tarea de sincronización para cuando vuelva la red
            enqueueSyncWorker()
        }
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
        return when {
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            else -> false
        }
    }

    private fun enqueueSyncWorker() {
        OfflineLocationSyncWorker.start(context)
    }
}
