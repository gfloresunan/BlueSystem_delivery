package com.example.shared.media.metrics

import android.util.Log
import com.example.shared.media.model.MediaMetrics
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Gestor de Observabilidad y Métricas de Rendimiento de Medios (ADR-006 - Pilar 7)
 * Registra tiempos de compresión, subida, aciertos de caché y ahorros de almacenamiento.
 */
object MediaMetricsManager {
    private const val TAG = "MediaMetricsManager"

    private val _metrics = MutableStateFlow(MediaMetrics())
    val metrics: StateFlow<MediaMetrics> = _metrics.asStateFlow()

    fun recordUploadSuccess(
        isDeduplicated: Boolean,
        bytesProcessed: Long,
        compressionTimeMs: Long,
        uploadTimeMs: Long
    ) {
        _metrics.update { current ->
            val totalUploads = current.totalUploads + 1
            val deduplicatedCount = if (isDeduplicated) current.deduplicatedCount + 1 else current.deduplicatedCount
            val totalBytesUploaded = if (!isDeduplicated) current.totalBytesUploaded + bytesProcessed else current.totalBytesUploaded
            val totalBytesSaved = if (isDeduplicated) current.totalBytesSavedByDedup + bytesProcessed else current.totalBytesSavedByDedup

            val newAvgCompression = (current.avgCompressionTimeMs * (totalUploads - 1) + compressionTimeMs) / totalUploads
            val newAvgUpload = (current.avgUploadTimeMs * (totalUploads - 1) + uploadTimeMs) / totalUploads

            current.copy(
                totalUploads = totalUploads,
                deduplicatedCount = deduplicatedCount,
                totalBytesUploaded = totalBytesUploaded,
                totalBytesSavedByDedup = totalBytesSaved,
                avgCompressionTimeMs = newAvgCompression,
                avgUploadTimeMs = newAvgUpload
            )
        }

        try {
            Log.d(TAG, "Métrica registrada: Deduplicado=$isDeduplicated | Compresión=${compressionTimeMs}ms | Carga=${uploadTimeMs}ms")
        } catch (e: Throwable) {}
    }
}
