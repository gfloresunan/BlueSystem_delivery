package com.example.data.repository.menu

import com.example.data.dto.menu.ProductVariantDto
import com.example.data.mapper.menu.VariantMapper
import com.example.domain.model.menu.ProductVariant
import com.example.domain.repository.menu.IMenuVariantRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Implementación Firestore de IMenuVariantRepository (v2.2 Enterprise)
 */
class MenuVariantRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuVariantRepository {

    override fun getVariantsByProductIdFlow(productId: String): Flow<List<ProductVariant>> = callbackFlow {
        if (productId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("variants")
            .whereEqualTo("productId", productId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val variants = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ProductVariantDto::class.java)?.let { VariantMapper.variantToDomain(it) }
                } ?: emptyList()
                trySend(variants)
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getVariantBySKU(variantKey: String): Result<ProductVariant?> {
        return try {
            val snapshot = firestore.collection("variants")
                .whereEqualTo("variantKey", variantKey)
                .limit(1)
                .get().await()

            val doc = snapshot.documents.firstOrNull()
            val dto = doc?.toObject(ProductVariantDto::class.java)
            Result.success(dto?.let { VariantMapper.variantToDomain(it) })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveVariant(variant: ProductVariant): Result<Unit> {
        return try {
            val docRef = firestore.collection("variants").document(
                variant.id.ifBlank { firestore.collection("variants").document().id }
            )
            val updatedVariant = variant.copy(id = docRef.id, updatedAt = System.currentTimeMillis())
            val dto = VariantMapper.variantToDto(updatedVariant)
            docRef.set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveVariantsBatch(variants: List<ProductVariant>): Result<Unit> {
        return try {
            if (variants.isEmpty()) return Result.success(Unit)
            val batch = firestore.batch()
            for (variant in variants) {
                val docRef = firestore.collection("variants").document(
                    variant.id.ifBlank { firestore.collection("variants").document().id }
                )
                val updatedVariant = variant.copy(id = docRef.id, updatedAt = System.currentTimeMillis())
                batch.set(docRef, VariantMapper.variantToDto(updatedVariant))
            }
            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteVariant(variantId: String): Result<Unit> {
        return try {
            firestore.collection("variants").document(variantId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
