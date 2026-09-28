package com.example.data.repository

import android.content.Context
import android.net.Uri
import android.util.Log
import com.example.data.service.ImageCompressionEngine
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

data class ProductImageUploadResult(
    val imageUrl: String,
    val thumbnailUrl: String,
    val storagePath: String,
    val mimeType: String,
    val width: Int,
    val height: Int,
    val sizeBytes: Long,
    val sha256Hash: String = "",
    val versionNumber: Int = 1,
    val imageVariants: Map<String, String> = emptyMap()
)

class ProductRepository(
    firestoreProvider: (() -> FirebaseFirestore)? = null,
    storageProvider: (() -> FirebaseStorage)? = null
) {
    private val firestore: FirebaseFirestore by lazy { firestoreProvider?.invoke() ?: FirebaseFirestore.getInstance() }
    private val storage: FirebaseStorage by lazy { storageProvider?.invoke() ?: FirebaseStorage.getInstance() }
    private val mediaUploadEngine by lazy { com.example.shared.media.engine.MediaUploadEngine(firestoreProvider, storageProvider) }

    companion object {
        private const val TAG = "ProductRepository"
        private const val PRODUCTS_COLLECTION = "products"
        private const val STORAGE_PATH = "products"
    }

    fun getProductsByBusiness(businessId: String): Flow<List<Product>> = callbackFlow {
        if (businessId.isBlank()) {
            trySend(emptyList())
            awaitClose { }
            return@callbackFlow
        }

        val allDocs = mutableMapOf<String, com.google.firebase.firestore.DocumentSnapshot>()

        fun emitCombined() {
            val list = parseAndFilterProductsForMerchant(allDocs.values.toList())
            trySend(list)
        }

        val listeners = mutableListOf<com.google.firebase.firestore.ListenerRegistration>()

        // 1. Root /products (businessId == businessId)
        listeners.add(
            firestore.collection(PRODUCTS_COLLECTION)
                .whereEqualTo("businessId", businessId)
                .addSnapshotListener { snap, error ->
                    if (error != null) {
                        Log.e(TAG, "Error escuchando productos por businessId: ${error.message}")
                    }
                    snap?.documents?.forEach { allDocs[it.id] = it }
                    emitCombined()
                }
        )

        // 2. Root /products (restaurantId == businessId)
        listeners.add(
            firestore.collection(PRODUCTS_COLLECTION)
                .whereEqualTo("restaurantId", businessId)
                .addSnapshotListener { snap, _ ->
                    snap?.documents?.forEach { allDocs[it.id] = it }
                    emitCombined()
                }
        )

        // 3. Root /products (comercioId == businessId)
        listeners.add(
            firestore.collection(PRODUCTS_COLLECTION)
                .whereEqualTo("comercioId", businessId)
                .addSnapshotListener { snap, _ ->
                    snap?.documents?.forEach { allDocs[it.id] = it }
                    emitCombined()
                }
        )

        // 4. Subcolección /businesses/{businessId}/products
        listeners.add(
            firestore.collection("businesses").document(businessId)
                .collection("products")
                .addSnapshotListener { snap, _ ->
                    snap?.documents?.forEach { allDocs[it.id] = it }
                    emitCombined()
                }
        )

        awaitClose {
            listeners.forEach { it.remove() }
        }
    }

    fun getActiveProducts(businessId: String): Flow<List<Product>> = callbackFlow {
        if (businessId.isBlank()) {
            trySend(emptyList())
            awaitClose { }
            return@callbackFlow
        }

        val allDocs = mutableMapOf<String, com.google.firebase.firestore.DocumentSnapshot>()

        fun emitCombined() {
            val list = parseAndFilterProducts(allDocs.values.toList())
            trySend(list)
        }

        val listeners = mutableListOf<com.google.firebase.firestore.ListenerRegistration>()
        val candidateBizIds = mutableSetOf(businessId.trim())
        if (businessId.startsWith("biz_")) {
            val stripped = businessId.removePrefix("biz_").trim()
            if (stripped.isNotBlank()) candidateBizIds.add(stripped)
        } else {
            candidateBizIds.add("biz_${businessId.trim()}")
        }

        for (bId in candidateBizIds) {
            if (bId.isBlank()) continue

            // 1. Root /products (businessId == bId)
            listeners.add(
                firestore.collection(PRODUCTS_COLLECTION)
                    .whereEqualTo("businessId", bId)
                    .addSnapshotListener { snap, _ ->
                        snap?.documents?.forEach { allDocs[it.id] = it }
                        emitCombined()
                    }
            )

            // 2. Root /products (restaurantId == bId)
            listeners.add(
                firestore.collection(PRODUCTS_COLLECTION)
                    .whereEqualTo("restaurantId", bId)
                    .addSnapshotListener { snap, _ ->
                        snap?.documents?.forEach { allDocs[it.id] = it }
                        emitCombined()
                    }
            )

            // 3. Root /products (comercioId == bId)
            listeners.add(
                firestore.collection(PRODUCTS_COLLECTION)
                    .whereEqualTo("comercioId", bId)
                    .addSnapshotListener { snap, _ ->
                        snap?.documents?.forEach { allDocs[it.id] = it }
                        emitCombined()
                    }
            )

            // 4. Subcolección /businesses/{bId}/products
            listeners.add(
                firestore.collection("businesses").document(bId)
                    .collection("products")
                    .addSnapshotListener { snap, _ ->
                        snap?.documents?.forEach { allDocs[it.id] = it }
                        emitCombined()
                    }
            )

            // 5. Subcolección /users/{bId}/products
            listeners.add(
                firestore.collection("users").document(bId)
                    .collection("products")
                    .addSnapshotListener { snap, _ ->
                        snap?.documents?.forEach { allDocs[it.id] = it }
                        emitCombined()
                    }
            )
        }

        awaitClose {
            listeners.forEach { it.remove() }
        }
    }

    private fun parseAndFilterProductsForMerchant(documents: List<com.google.firebase.firestore.DocumentSnapshot>): List<Product> {
        return documents.mapNotNull { doc ->
            try {
                val statusStr = doc.getString("status") ?: ""
                val lifecycleStatusStr = doc.getString("lifecycleStatus") ?: ""
                if (statusStr.equals("DELETED", ignoreCase = true) || lifecycleStatusStr.equals("DELETED", ignoreCase = true)) {
                    return@mapNotNull null
                }

                val catNameDoc = doc.getString("categoryName")
                    ?: doc.getString("categoria")
                    ?: doc.getString("category")
                    ?: "Menú Principal"

                var p: Product? = null
                try {
                    p = doc.toObject(Product::class.java)?.copy(
                        id = doc.id,
                        categoryName = catNameDoc
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "Error deserializando producto Merchant ${doc.id}, ejecutando parseo manual: ${e.message}")
                }

                if (p == null || p.categoryName.isBlank()) {
                    p = parseProductManual(doc).copy(categoryName = catNameDoc)
                }
                p
            } catch (e: Exception) {
                Log.e(TAG, "Error al deserializar producto Merchant ${doc.id}: ${e.message}")
                null
            }
        }
    }

    private fun parseAndFilterProducts(documents: List<com.google.firebase.firestore.DocumentSnapshot>): List<Product> {
        return documents.mapNotNull { doc ->
            try {
                val statusStr = doc.getString("status") ?: ""
                val lifecycleStatusStr = doc.getString("lifecycleStatus") ?: ""
                if (statusStr.equals("DELETED", ignoreCase = true) || lifecycleStatusStr.equals("DELETED", ignoreCase = true)) {
                    return@mapNotNull null
                }
                if (statusStr.equals("INACTIVE", ignoreCase = true)) {
                    return@mapNotNull null
                }

                val isActive = getBooleanValue(doc, "active", "isActive")
                val isAvail = getBooleanValue(doc, "isAvailable", "available")
                if (isActive == false || isAvail == false) return@mapNotNull null

                val catNameDoc = doc.getString("categoryName")
                    ?: doc.getString("categoria")
                    ?: doc.getString("category")
                    ?: "Menú Principal"

                var p: Product? = null
                try {
                    p = doc.toObject(Product::class.java)?.copy(
                        id = doc.id,
                        categoryName = catNameDoc
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "Error en des-serialización directa de producto ${doc.id}, ejecutando parseo manual: ${e.message}")
                }

                if (p == null || p.categoryName.isBlank()) {
                    p = parseProductManual(doc).copy(categoryName = catNameDoc)
                }
                p
            } catch (e: Exception) {
                Log.e(TAG, "Error al deserializar producto ${doc.id}: ${e.message}")
                null
            }
        }
    }

    private fun parseProductManual(doc: com.google.firebase.firestore.DocumentSnapshot): Product {
        val name = doc.getString("name") ?: doc.getString("nombre") ?: doc.getString("title") ?: "Producto sin nombre"
        val description = doc.getString("description") ?: doc.getString("descripcion") ?: ""
        val shortDescription = doc.getString("shortDescription") ?: doc.getString("descripcionCorta") ?: ""
        val longDescription = doc.getString("longDescription") ?: doc.getString("descripcionLarga") ?: ""
        val categoryId = doc.getString("categoryId") ?: doc.getString("categoriaId") ?: ""
        val subCategoryId = doc.getString("subCategoryId") ?: doc.getString("subcategoriaId") ?: ""
        val categoryName = doc.getString("categoryName") ?: doc.getString("categoria") ?: doc.getString("category") ?: "Menú Principal"
        val subCategoryName = doc.getString("subCategoryName") ?: doc.getString("subcategoria") ?: ""
        val imageUrl = doc.getString("imageUrl") ?: doc.getString("imagenUrl") ?: doc.getString("photoUrl") ?: ""
        val thumbnailUrl = doc.getString("thumbnailUrl") ?: imageUrl
        val businessId = doc.getString("businessId") ?: doc.getString("restaurantId") ?: doc.getString("comercioId") ?: ""
        val branchId = doc.getString("branchId") ?: doc.getString("sucursalId") ?: ""

        val price = getDoubleValue(doc, "price", "precio") ?: 0.0
        val originalPrice = getDoubleValue(doc, "originalPrice", "precioOriginal")
        val estimatedCost = getDoubleValue(doc, "estimatedCost", "costoEstimado", "costo")
        val taxPercentage = getDoubleValue(doc, "taxPercentage", "tax", "isv", "impuesto") ?: 15.0
        val stockQty = getIntValue(doc, "stockQuantity", "stock", "cantidad")
        val minStockAlert = getIntValue(doc, "minStockAlert", "alertaStockMinimo") ?: 5
        val autoHideOnZeroStock = getBooleanValue(doc, "autoHideOnZeroStock", "ocultarSinStock") ?: true

        val isPopular = getBooleanValue(doc, "isPopular", "popular", "esPopular") ?: false
        val isVegetarian = getBooleanValue(doc, "isVegetarian", "vegetarian", "vegetariano") ?: false
        val isSpicy = getBooleanValue(doc, "isSpicy", "spicy", "picante") ?: false
        val isNew = getBooleanValue(doc, "isNew", "nuevo", "esNuevo") ?: false
        val isTopSeller = getBooleanValue(doc, "isTopSeller", "topSeller", "masVendido") ?: false
        val isRecommended = getBooleanValue(doc, "isRecommended", "recommended", "recomendado") ?: false
        val spicyLevel = getIntValue(doc, "spicyLevel", "nivelPicante") ?: 0

        val imagesAny = doc.get("images") ?: doc.get("imagenes")
        val imagesList = if (imagesAny is List<*>) imagesAny.mapNotNull { it?.toString() } else emptyList()

        return Product(
            id = doc.id,
            businessId = businessId,
            branchId = branchId,
            name = name,
            description = description,
            shortDescription = shortDescription,
            longDescription = longDescription,
            categoryId = categoryId,
            subCategoryId = subCategoryId,
            categoryName = categoryName,
            subCategoryName = subCategoryName,
            price = price,
            originalPrice = originalPrice,
            estimatedCost = estimatedCost,
            taxPercentage = taxPercentage,
            stockQuantity = stockQty,
            minStockAlert = minStockAlert,
            autoHideOnZeroStock = autoHideOnZeroStock,
            imageUrl = imageUrl,
            thumbnailUrl = thumbnailUrl,
            images = imagesList,
            isPopular = isPopular,
            isVegetarian = isVegetarian,
            isSpicy = isSpicy,
            isNew = isNew,
            isTopSeller = isTopSeller,
            isRecommended = isRecommended,
            spicyLevel = spicyLevel,
            status = com.example.domain.model.ProductStatus.ACTIVE
        )
    }

    private fun getDoubleValue(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fieldNames: String): Double? {
        for (f in fieldNames) {
            val valAny = doc.get(f) ?: continue
            when (valAny) {
                is Number -> return valAny.toDouble()
                is String -> valAny.toDoubleOrNull()?.let { return it }
            }
        }
        return null
    }

    private fun getIntValue(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fieldNames: String): Int? {
        for (f in fieldNames) {
            val valAny = doc.get(f) ?: continue
            when (valAny) {
                is Number -> return valAny.toInt()
                is String -> valAny.toIntOrNull()?.let { return it }
            }
        }
        return null
    }

    private fun getBooleanValue(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fieldNames: String): Boolean? {
        for (f in fieldNames) {
            val valAny = doc.get(f) ?: continue
            when (valAny) {
                is Boolean -> return valAny
                is String -> return valAny.lowercase() == "true" || valAny == "1"
                is Number -> return valAny.toInt() == 1
            }
        }
        return null
    }

    fun getProductById(productId: String): Flow<Product?> = callbackFlow {
        val listener = firestore.collection(PRODUCTS_COLLECTION)
            .document(productId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(null)
                    return@addSnapshotListener
                }
                val product = try {
                    snapshot?.toObject(Product::class.java)?.copy(id = snapshot.id)
                } catch (e: Exception) {
                    Log.w(TAG, "Error deserializing product $productId: ${e.message}")
                    null
                }
                trySend(product)
            }

        awaitClose { listener.remove() }
    }

    /**
     * Subida Orquestada Enterprise (ADR-006 EMSS v1.0) mediante MediaUploadEngine.
     * Incluye deduplicación SHA-256, multi-resolución, versionado e integridad.
     */
    suspend fun uploadProductImage(
        context: Context,
        productId: String,
        localImageUri: Uri,
        businessId: String = "",
        onProgress: (Int) -> Unit = {},
        onProgressStatus: (Int, String) -> Unit = { _, _ -> }
    ): Result<ProductImageUploadResult> {
        val res = mediaUploadEngine.uploadMediaItem(
            context = context,
            moduleName = "products",
            entityId = productId,
            localUri = localImageUri,
            onProgressStatus = { percent, status ->
                onProgress(percent)
                onProgressStatus(percent, status)
            }
        )

        return res.map { media ->
            ProductImageUploadResult(
                imageUrl = media.primaryUrl,
                thumbnailUrl = media.thumbnailUrl,
                storagePath = media.storagePath,
                mimeType = media.mimeType,
                width = media.width,
                height = media.height,
                sizeBytes = media.sizeBytes,
                sha256Hash = media.sha256Hash,
                versionNumber = media.versionNumber,
                imageVariants = media.variants
            )
        }
    }

    /**
     * Eliminación Atómica de Archivos en Firebase Storage para un Producto
     */
    suspend fun deleteProductStorageFolder(productId: String): Result<Unit> {
        return try {
            val folderRef = storage.reference.child("$STORAGE_PATH/$productId")
            val listResult = folderRef.listAll().await()
            for (item in listResult.items) {
                try {
                    item.delete().await()
                } catch (e: Throwable) {
                    Log.w(TAG, "Advertencia borrando item de storage: ${item.path}")
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.w(TAG, "No se pudo limpiar la carpeta Storage de $productId: ${e.message}")
            Result.success(Unit)
        }
    }

    private fun isLocalPath(path: String?): Boolean {
        if (path.isNullOrBlank()) return false
        val p = path.trim()
        return p.startsWith("file://") ||
                p.startsWith("/data/user/") ||
                p.startsWith("/data/data/") ||
                p.startsWith("/storage/emulated/") ||
                p.startsWith("content://")
    }

    /**
     * Validación Estricta de Tamaño de Documento Firestore (< 20 KB), Ausencia de Base64 y Ausencia de Rutas Locales
     */
    fun validateFirestoreDocumentSize(product: Product): Result<Unit> {
        if (product.imageUrl.startsWith("data:image")) {
            return Result.failure(IllegalStateException("Violación de Arquitectura: imageUrl contiene string Base64"))
        }
        if (product.thumbnailUrl.startsWith("data:image")) {
            return Result.failure(IllegalStateException("Violación de Arquitectura: thumbnailUrl contiene string Base64"))
        }
        if (product.images.any { it.startsWith("data:image") }) {
            return Result.failure(IllegalStateException("Violación de Arquitectura: images list contiene string Base64"))
        }

        // Validación de Integridad ADR-006: Prohibir rutas locales de dispositivo en Firestore
        if (isLocalPath(product.imageUrl)) {
            return Result.failure(IllegalStateException("Violación de Integridad: imageUrl contiene una ruta local privada de dispositivo: ${product.imageUrl}"))
        }
        if (isLocalPath(product.thumbnailUrl)) {
            return Result.failure(IllegalStateException("Violación de Integridad: thumbnailUrl contiene una ruta local privada de dispositivo: ${product.thumbnailUrl}"))
        }
        if (product.images.any { isLocalPath(it) }) {
            return Result.failure(IllegalStateException("Violación de Integridad: images list contiene una ruta local privada de dispositivo"))
        }

        val totalChars = product.id.length +
                product.businessId.length +
                product.name.length +
                product.description.length +
                product.shortDescription.length +
                product.longDescription.length +
                product.categoryName.length +
                product.imageUrl.length +
                product.thumbnailUrl.length +
                product.storagePath.length +
                product.imageVariants.values.sumOf { it.length } +
                product.images.sumOf { it.length } + 500

        val estimatedKB = totalChars / 1024.0
        try {
            Log.d(TAG, "Documento de producto '${product.name}' tamaño estimado: ${String.format("%.2f", estimatedKB)} KB")
        } catch (e: Throwable) {}

        if (estimatedKB > 50.0) {
            return Result.failure(IllegalStateException("El documento del producto excede el límite permitido: ${String.format("%.2f", estimatedKB)} KB"))
        }

        return Result.success(Unit)
    }

    suspend fun addProduct(product: Product): Result<Product> = addProduct(product, null)

    suspend fun addProduct(product: Product, imageBytes: ByteArray?): Result<Product> {
        return try {
            val validation = validateFirestoreDocumentSize(product)
            if (validation.isFailure) {
                return Result.failure(validation.exceptionOrNull() ?: IllegalStateException("Error de validación de documento"))
            }

            val productId = product.id.ifBlank { UUID.randomUUID().toString() }
            val newProduct = product.copy(
                id = productId,
                createdAt = com.google.firebase.Timestamp.now(),
                updatedAt = com.google.firebase.Timestamp.now()
            )

            firestore.collection(PRODUCTS_COLLECTION)
                .document(productId)
                .set(newProduct)
                .await()

            Log.i(TAG, "Producto guardado con éxito en Firestore ID=$productId")
            Result.success(newProduct)
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando producto en Firestore: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun updateProduct(productId: String, updates: Map<String, Any>): Result<Unit> = updateProduct(productId, updates, null)

    suspend fun updateProduct(productId: String, updates: Map<String, Any>, newImageBytes: ByteArray?): Result<Unit> {
        return try {
            val finalUpdates = updates.toMutableMap()
            finalUpdates["updatedAt"] = com.google.firebase.Timestamp.now()

            val imgUrl = finalUpdates["imageUrl"] as? String
            if (imgUrl != null) {
                if (imgUrl.startsWith("data:image")) {
                    return Result.failure(IllegalStateException("No se permite guardar Base64 en Firestore"))
                }
                if (isLocalPath(imgUrl)) {
                    return Result.failure(IllegalStateException("No se permite guardar rutas locales privadas de dispositivo en Firestore: $imgUrl"))
                }
            }
            val thumbUrl = finalUpdates["thumbnailUrl"] as? String
            if (thumbUrl != null && isLocalPath(thumbUrl)) {
                return Result.failure(IllegalStateException("No se permite guardar rutas locales privadas en thumbnailUrl: $thumbUrl"))
            }

            firestore.collection(PRODUCTS_COLLECTION)
                .document(productId)
                .update(finalUpdates)
                .await()

            Log.i(TAG, "Producto actualizado con éxito en Firestore ID=$productId")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error actualizando producto en Firestore: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Eliminación de producto con limpieza de Storage asociada (Requisito 4)
     */
    suspend fun deleteProduct(productId: String, permanentDelete: Boolean = false): Result<Unit> {
        return try {
            if (permanentDelete) {
                deleteProductStorageFolder(productId)
                firestore.collection(PRODUCTS_COLLECTION).document(productId).delete().await()
            } else {
                firestore.collection(PRODUCTS_COLLECTION)
                    .document(productId)
                    .update(mapOf(
                        "status" to ProductStatus.INACTIVE.name,
                        "updatedAt" to com.google.firebase.Timestamp.now()
                    ))
                    .await()
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reorderProducts(productIds: List<String>): Result<Unit> {
        return try {
            firestore.runBatch { batch ->
                productIds.forEachIndexed { index, productId ->
                    val ref = firestore.collection(PRODUCTS_COLLECTION).document(productId)
                    batch.update(ref, mapOf("order" to index))
                }
            }.await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun toggleProductStatus(
        productId: String,
        currentStatus: ProductStatus
    ): Result<ProductStatus> {
        val newStatus = when (currentStatus) {
            ProductStatus.ACTIVE -> ProductStatus.INACTIVE
            ProductStatus.INACTIVE -> ProductStatus.ACTIVE
            ProductStatus.OUT_OF_STOCK -> ProductStatus.ACTIVE
            else -> ProductStatus.ACTIVE
        }

        return try {
            firestore.collection(PRODUCTS_COLLECTION)
                .document(productId)
                .update(mapOf("status" to newStatus.name))
                .await()
            Result.success(newStatus)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
