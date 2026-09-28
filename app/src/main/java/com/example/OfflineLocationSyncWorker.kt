package com.example

import android.content.Context
import androidx.work.*
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class OfflineLocationSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val locationDao = AppDatabase.getDatabase(applicationContext).offlineLocationDao()
        val pendingLocations = locationDao.getAllPendingLocations()
        if (pendingLocations.isEmpty()) return Result.success()

        val db = FirebaseFirestore.getInstance()

        return try {
            // Firestore tiene un límite estricto de 500 operaciones por WriteBatch.
            // Usamos chunked(500) para garantizar que nunca excedemos el límite y la subida sea segura.
            pendingLocations.chunked(500).forEach { chunk ->
                val batch = db.batch()
                val idsToDelete = mutableListOf<Long>()

                chunk.forEach { loc ->
                    val routeRef = db.collection("historial_rutas")
                        .document(loc.motorizadoId)
                        .collection("puntos")
                        .document(loc.timestamp.toString())

                    val data = mapOf(
                        "latitud" to loc.latitud,
                        "longitud" to loc.longitud,
                        "timestamp" to loc.timestamp,
                        "offline" to true
                    )
                    batch.set(routeRef, data)
                    idsToDelete.add(loc.id)
                }

                batch.commit().await() // Subida atómica por bloque
                locationDao.deleteLocations(idsToDelete) // Limpiamos la BD local solo para el lote exitoso
            }
            Result.success()
        } catch (e: Exception) {
            // Si la conexión falla a mitad, reintentamos automáticamente respetando el backoff
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "offline_gps_sync_work"

        fun start(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED) // Regla de oro: Solo ejecutar con internet
                .build()

            val syncRequest = OneTimeWorkRequestBuilder<OfflineLocationSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    java.util.concurrent.TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.KEEP, // Mantiene la tarea activa si ya hay una en cola esperando red
                syncRequest
            )
        }
    }
}
