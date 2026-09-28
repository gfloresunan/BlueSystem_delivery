package com.example.shared.media.dedup

import android.util.Log
import com.example.shared.media.model.MediaMetadata
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * Motor de Deduplicación por Hash SHA-256 (ADR-006 - Pilar 4)
 * Evita resubir imágenes existentes en Firebase Storage/CDN.
 */
class MediaDeduplicationEngine(
    firestoreProvider: (() -> FirebaseFirestore)? = null
) {
    private val firestore: FirebaseFirestore by lazy { firestoreProvider?.invoke() ?: FirebaseFirestore.getInstance() }

    companion object {
        private const val TAG = "MediaDeduplicationEngine"
        private const val MEDIA_REGISTRY_COLLECTION = "media_registry"
    }

    suspend fun findExistingMediaByHash(sha256Hash: String): MediaMetadata? {
        if (sha256Hash.isBlank()) return null
        return try {
            val doc = firestore.collection(MEDIA_REGISTRY_COLLECTION)
                .document(sha256Hash)
                .get()
                .await()

            if (doc.exists()) {
                Log.i(TAG, "Deduplicación exitosa: Imagen con hash $sha256Hash encontrada en media_registry.")
                doc.toObject(MediaMetadata::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            try {
                Log.w(TAG, "No se pudo consultar media_registry para deduplicación: ${e.message}")
            } catch (t: Throwable) {}
            null
        }
    }

    suspend fun registerMediaHash(sha256Hash: String, metadata: MediaMetadata): Result<Unit> {
        if (sha256Hash.isBlank()) return Result.success(Unit)
        return try {
            firestore.collection(MEDIA_REGISTRY_COLLECTION)
                .document(sha256Hash)
                .set(metadata)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            try {
                Log.e(TAG, "Fallo registrando hash $sha256Hash en media_registry", e)
            } catch (t: Throwable) {}
            Result.failure(e)
        }
    }
}
