package com.example.shared.media.engine

import android.content.Context
import android.net.Uri
import android.util.Log
import com.example.data.service.ImageCompressionEngine
import com.example.shared.media.crypto.ChecksumEngine
import com.example.shared.media.dedup.MediaDeduplicationEngine
import com.example.shared.media.metrics.MediaMetricsManager
import com.example.shared.media.model.MediaMetadata
import com.example.shared.media.model.MediaUploadResult
import com.example.shared.media.model.MediaVersionRecord
import com.example.shared.media.resolver.MediaResolver
import com.example.shared.media.versioning.MediaVersioningManager
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.tasks.await

/**
 * Orquestador Central Enterprise de Medios (ADR-006 - EMSS v1.0)
 * Reutilizable por Productos, Comercios, Empresas, Motorizados, Usuarios y Promociones.
 */
class MediaUploadEngine(
    firestoreProvider: (() -> FirebaseFirestore)? = null,
    storageProvider: (() -> FirebaseStorage)? = null
) {
    private val firestore: FirebaseFirestore by lazy { firestoreProvider?.invoke() ?: FirebaseFirestore.getInstance() }
    private val storage: FirebaseStorage by lazy { storageProvider?.invoke() ?: FirebaseStorage.getInstance() }
    private val deduplicationEngine by lazy { MediaDeduplicationEngine(firestoreProvider) }

    companion object {
        private const val TAG = "MediaUploadEngine"
        private const val BASE_STORAGE_PATH = "media"
    }

    suspend fun uploadMediaItem(
        context: Context,
        moduleName: String, // ej: "products", "stores", "users", "drivers"
        entityId: String,
        localUri: Uri,
        existingHistory: List<MediaVersionRecord> = emptyList(),
        onProgressStatus: (Int, String) -> Unit = { _, _ -> }
    ): Result<MediaUploadResult> {
        val startTime = System.currentTimeMillis()
        return try {
            onProgressStatus(5, "Leyendo archivo e iniciando verificación de integridad SHA-256...")

            val inputStream = context.contentResolver.openInputStream(localUri)
                ?: return Result.failure(IllegalStateException("No fue posible abrir el archivo seleccionado"))

            val rawBytes = inputStream.use { it.readBytes() }
            if (rawBytes.isEmpty()) {
                return Result.failure(IllegalStateException("El archivo seleccionado está vacío"))
            }

            // 1. Fase SHA-256 Checksum
            val sha256Hash = ChecksumEngine.calculateSha256(rawBytes)
            onProgressStatus(15, "Hash SHA-256 calculado ($sha256Hash). Verificando deduplicación...")

            // 2. Fase Deduplicación por Hash
            val existingMedia = deduplicationEngine.findExistingMediaByHash(sha256Hash)
            if (existingMedia != null && existingMedia.variants.isNotEmpty()) {
                onProgressStatus(100, "¡Imagen deduplicada por hash SHA-256! Reutilizando almacenamiento...")
                val (versionNum, updatedHistory) = MediaVersioningManager.createNextVersionRecord(
                    currentHistory = existingHistory,
                    newImageUrl = existingMedia.variants["1200"] ?: existingMedia.storagePath,
                    newSha256Hash = sha256Hash
                )

                val uploadTime = System.currentTimeMillis() - startTime
                MediaMetricsManager.recordUploadSuccess(
                    isDeduplicated = true,
                    bytesProcessed = rawBytes.size.toLong(),
                    compressionTimeMs = 0L,
                    uploadTimeMs = uploadTime
                )

                return Result.success(
                    MediaUploadResult(
                        isDeduplicated = true,
                        sha256Hash = sha256Hash,
                        primaryUrl = MediaResolver.resolveUrl(existingMedia.storagePath, existingMedia.variants["1200"] ?: ""),
                        thumbnailUrl = MediaResolver.resolveUrl(existingMedia.storagePath, existingMedia.variants["300"] ?: "", "300"),
                        storagePath = existingMedia.storagePath,
                        mimeType = existingMedia.mimeType,
                        width = existingMedia.width,
                        height = existingMedia.height,
                        sizeBytes = existingMedia.sizeBytes,
                        versionNumber = versionNum,
                        variants = existingMedia.variants
                    )
                )
            }

            // 3. Fase Compresión Multi-Resolución
            val compressStart = System.currentTimeMillis()
            onProgressStatus(25, "Comprimiendo imagen a 4 escalas (100px, 300px, 600px, 1200px)...")
            val multiRes = ImageCompressionEngine.processMultiResImageUri(context, localUri)
                ?: return Result.failure(IllegalStateException("Error comprimiendo variantes de imagen"))
            val compressionTime = System.currentTimeMillis() - compressStart

            // 4. Fase Subida a Firebase Storage
            val uploadStart = System.currentTimeMillis()
            val ext = if (multiRes.original1200.mimeType.contains("webp")) "webp" else "jpg"
            val targetFolder = "$BASE_STORAGE_PATH/$moduleName/$entityId"

            onProgressStatus(40, "Subiendo miniatura compacta 100px...")
            val ref100 = storage.reference.child("$targetFolder/thumb_100.$ext")
            ref100.putBytes(multiRes.thumb100.bytes).await()
            val url100 = ref100.downloadUrl.await().toString()

            onProgressStatus(60, "Subiendo miniatura de tarjetas 300px...")
            val ref300 = storage.reference.child("$targetFolder/thumb_300.$ext")
            ref300.putBytes(multiRes.thumb300.bytes).await()
            val url300 = ref300.downloadUrl.await().toString()

            onProgressStatus(75, "Subiendo imagen HD móvil 600px...")
            val ref600 = storage.reference.child("$targetFolder/medium_600.$ext")
            ref600.putBytes(multiRes.medium600.bytes).await()
            val url600 = ref600.downloadUrl.await().toString()

            onProgressStatus(90, "Subiendo imagen principal Ultra 1200px...")
            val ref1200 = storage.reference.child("$targetFolder/original_1200.$ext")
            ref1200.putBytes(multiRes.original1200.bytes).await()
            val url1200 = ref1200.downloadUrl.await().toString()

            val uploadTime = System.currentTimeMillis() - uploadStart

            val variantsMap = mapOf(
                "100" to url100,
                "300" to url300,
                "600" to url600,
                "1200" to url1200
            )

            // 5. Fase Versionado
            val (versionNum, updatedHistory) = MediaVersioningManager.createNextVersionRecord(
                currentHistory = existingHistory,
                newImageUrl = url1200,
                newSha256Hash = sha256Hash
            )

            // 6. Fase Registro en Deduplication Registry
            val metadata = MediaMetadata(
                sha256Hash = sha256Hash,
                sizeBytes = multiRes.original1200.sizeBytes,
                mimeType = multiRes.original1200.mimeType,
                width = multiRes.original1200.width,
                height = multiRes.original1200.height,
                storagePath = "$targetFolder/original_1200.$ext",
                currentVersion = versionNum,
                variants = variantsMap,
                versionHistory = updatedHistory
            )
            deduplicationEngine.registerMediaHash(sha256Hash, metadata)

            // 7. Fase Métrica Operativa
            MediaMetricsManager.recordUploadSuccess(
                isDeduplicated = false,
                bytesProcessed = rawBytes.size.toLong(),
                compressionTimeMs = compressionTime,
                uploadTimeMs = uploadTime
            )

            onProgressStatus(100, "Carga y deduplicación procesadas con éxito (v$versionNum)")

            Result.success(
                MediaUploadResult(
                    isDeduplicated = false,
                    sha256Hash = sha256Hash,
                    primaryUrl = MediaResolver.resolveUrl(metadata.storagePath, url1200),
                    thumbnailUrl = MediaResolver.resolveUrl(metadata.storagePath, url300, "300"),
                    storagePath = metadata.storagePath,
                    mimeType = multiRes.original1200.mimeType,
                    width = multiRes.original1200.width,
                    height = multiRes.original1200.height,
                    sizeBytes = multiRes.original1200.sizeBytes,
                    versionNumber = versionNum,
                    variants = variantsMap
                )
            )
        } catch (e: Exception) {
            try {
                Log.e(TAG, "Error en pipeline orquestado de medios: ${e.message}", e)
            } catch (t: Throwable) {}
            Result.failure(e)
        }
    }
}
