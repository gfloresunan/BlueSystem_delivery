package com.example.data.repository.menu

import com.example.data.dto.menu.ProductDto
import com.example.data.dto.menu.toProductDtoSafely
import com.example.data.mapper.menu.ProductMapper
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.repository.menu.IMenuProductRepository
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class MenuProductRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuProductRepository {

    private val productsCollection = firestore.collection("products")

    override fun getProductsFlow(restaurantId: String): Flow<List<MenuProduct>> = callbackFlow {
        if (restaurantId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        var secondaryListener: com.google.firebase.firestore.ListenerRegistration? = null
        val listener = productsCollection
            .whereEqualTo("businessId", restaurantId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || snapshot.isEmpty) {
                    if (secondaryListener == null) {
                        secondaryListener = productsCollection
                            .whereEqualTo("restaurantId", restaurantId)
                            .addSnapshotListener { secSnap, secErr ->
                                if (secErr != null || secSnap == null) {
                                    if (snapshot != null && !snapshot.isEmpty) {
                                        val dtos = snapshot.documents.mapNotNull { doc -> doc.toProductDtoSafely() }
                                        trySend(dtos.map { ProductMapper.toDomain(it) })
                                    } else {
                                        trySend(emptyList())
                                    }
                                    return@addSnapshotListener
                                }
                                val dtos = secSnap.documents.mapNotNull { doc -> doc.toProductDtoSafely() }
                                trySend(dtos.map { ProductMapper.toDomain(it) })
                            }
                    }
                    return@addSnapshotListener
                }

                val dtos = snapshot.documents.mapNotNull { doc -> doc.toProductDtoSafely() }
                val products = dtos.map { ProductMapper.toDomain(it) }
                trySend(products)
            }

        awaitClose {
            listener.remove()
            secondaryListener?.remove()
        }
    }

    override fun getProductsByCategoryFlow(
        restaurantId: String,
        categoryId: String
    ): Flow<List<MenuProduct>> = callbackFlow {
        if (restaurantId.isBlank() || categoryId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = productsCollection
            .whereEqualTo("businessId", restaurantId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val dtos = snapshot.documents.mapNotNull { doc -> doc.toProductDtoSafely() }
                val filtered = dtos.filter { it.getEffectiveCategoryId() == categoryId || it.primaryCategoryId == categoryId || it.categoryId == categoryId }
                val products = filtered.map { ProductMapper.toDomain(it) }
                trySend(products)
            }

        awaitClose { listener.remove() }
    }

    override fun getProductsByGlobalCategoryFlow(
        globalCategoryId: String
    ): Flow<List<MenuProduct>> = callbackFlow {
        if (globalCategoryId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = productsCollection
            .whereEqualTo("globalCategoryId", globalCategoryId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val dtos = snapshot.documents.mapNotNull { doc -> doc.toProductDtoSafely() }
                val activeOnly = dtos.filter { it.getEffectiveIsActive() && !it.getEffectiveBusinessId().isBlank() }
                val products = activeOnly.map { ProductMapper.toDomain(it) }
                trySend(products)
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getProductById(productId: String): Result<MenuProduct?> {
        return try {
            val snapshot = productsCollection.document(productId).get().await()
            val dto = snapshot.toProductDtoSafely()
            Result.success(ProductMapper.toDomain(dto))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveProduct(product: MenuProduct): Result<Unit> {
        return try {
            val docId = product.id.ifBlank { productsCollection.document().id }
            val finalProduct = product.copy(id = docId, updatedAt = System.currentTimeMillis())
            val dto = ProductMapper.toDto(finalProduct)
            productsCollection.document(docId).set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateProductStatus(
        productId: String,
        status: MenuProductStatus
    ): Result<Unit> {
        return try {
            productsCollection.document(productId).update(
                mapOf(
                    "status" to status.name,
                    "updatedAt" to System.currentTimeMillis()
                )
            ).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteProduct(productId: String): Result<Unit> {
        return try {
            productsCollection.document(productId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
