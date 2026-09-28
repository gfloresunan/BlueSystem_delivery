package com.example

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await

class LocationSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val dao = database.offlineLocationDao()
        val pendingLocations = dao.getAllPendingLocations()

        if (pendingLocations.isEmpty()) {
            return Result.success()
        }

        val db = FirebaseFirestore.getInstance()
        
        try {
            // Firestore batch write
            val batch = db.batch()
            val successfulIds = mutableListOf<Long>()

            pendingLocations.forEach { loc ->
                val ref = db.collection("ubicaciones_repartidores").document(loc.motorizadoId)
                val updateData = mapOf(
                    "coordenadas" to mapOf("latitud" to loc.latitud, "longitud" to loc.longitud),
                    "ultimaActualizacion" to java.time.Instant.ofEpochMilli(loc.timestamp).toString()
                )
                // We use set with merge to create or update
                batch.set(ref, updateData, SetOptions.merge())
                successfulIds.add(loc.id)
            }

            batch.commit().await()
            
            // Si el commit es exitoso, borramos de Room
            if (successfulIds.isNotEmpty()) {
                dao.deleteLocations(successfulIds)
                Log.d("LocationSyncWorker", "Synced ${successfulIds.size} locations.")
            }
            
            return Result.success()
        } catch (e: Exception) {
            Log.e("LocationSyncWorker", "Error syncing locations", e)
            return Result.retry()
        }
    }
}
