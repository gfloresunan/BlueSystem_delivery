package com.example.shared.media

import com.example.shared.media.metrics.MediaMetricsManager
import org.junit.Assert.*
import org.junit.Test

class MediaMetricsTest {

    @Test
    fun testRecordUploadMetrics() {
        MediaMetricsManager.recordUploadSuccess(
            isDeduplicated = true,
            bytesProcessed = 250000L,
            compressionTimeMs = 50L,
            uploadTimeMs = 120L
        )

        val metrics = MediaMetricsManager.metrics.value
        assertTrue("El total de uploads registrados debe ser >= 1", metrics.totalUploads >= 1)
        assertTrue("Los bytes guardados por deduplicación deben ser >= 250000", metrics.totalBytesSavedByDedup >= 250000L)
    }
}
