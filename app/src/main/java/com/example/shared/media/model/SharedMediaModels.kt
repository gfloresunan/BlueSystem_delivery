package com.example.shared.media.model

import com.google.firebase.Timestamp

data class MediaVersionRecord(
    val versionNumber: Int,
    val imageUrl: String,
    val sha256Hash: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class MediaMetadata(
    val sha256Hash: String = "",
    val sizeBytes: Long = 0L,
    val mimeType: String = "image/webp",
    val width: Int = 0,
    val height: Int = 0,
    val storagePath: String = "",
    val currentVersion: Int = 1,
    val variants: Map<String, String> = emptyMap(),
    val versionHistory: List<MediaVersionRecord> = emptyList()
)

data class MediaUploadResult(
    val isDeduplicated: Boolean,
    val sha256Hash: String,
    val primaryUrl: String,
    val thumbnailUrl: String,
    val storagePath: String,
    val mimeType: String,
    val width: Int,
    val height: Int,
    val sizeBytes: Long,
    val versionNumber: Int,
    val variants: Map<String, String> = emptyMap()
)

data class MediaMetrics(
    val totalUploads: Int = 0,
    val deduplicatedCount: Int = 0,
    val totalBytesUploaded: Long = 0L,
    val totalBytesSavedByDedup: Long = 0L,
    val avgCompressionTimeMs: Long = 0L,
    val avgUploadTimeMs: Long = 0L
)
