package com.example.shared.media.versioning

import com.example.shared.media.model.MediaVersionRecord

/**
 * Gestor de Versionado e Histórico de Imágenes (ADR-006 - Pilar 6)
 * Registra etiquetas de versión (v1, v2, v3) para trazabilidad, auditoría y recuperación.
 */
object MediaVersioningManager {

    fun createNextVersionRecord(
        currentHistory: List<MediaVersionRecord>,
        newImageUrl: String,
        newSha256Hash: String
    ): Pair<Int, List<MediaVersionRecord>> {
        val nextVersionNumber = (currentHistory.maxOfOrNull { it.versionNumber } ?: 0) + 1
        val newRecord = MediaVersionRecord(
            versionNumber = nextVersionNumber,
            imageUrl = newImageUrl,
            sha256Hash = newSha256Hash,
            timestamp = System.currentTimeMillis()
        )
        val updatedHistory = currentHistory + newRecord
        return Pair(nextVersionNumber, updatedHistory)
    }
}
