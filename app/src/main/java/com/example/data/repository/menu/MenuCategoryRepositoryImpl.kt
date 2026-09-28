package com.example.data.repository.menu

import com.example.data.dto.menu.CategoryDto
import com.example.data.dto.menu.toCategoryDtoSafely
import com.example.data.mapper.menu.CategoryMapper
import com.example.domain.model.menu.MenuCategory
import com.example.domain.repository.menu.IMenuCategoryRepository
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class MenuCategoryRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuCategoryRepository {

    private val categoriesCollection = firestore.collection("categories")

    override fun getCategoriesFlow(restaurantId: String): Flow<List<MenuCategory>> = callbackFlow {
        if (restaurantId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = categoriesCollection
            .whereEqualTo("restaurantId", restaurantId)
            .orderBy("orderIndex", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val dtos = snapshot?.documents?.mapNotNull { doc -> doc.toCategoryDtoSafely() } ?: emptyList()
                val categories = dtos.map { CategoryMapper.toDomain(it) }
                trySend(categories)
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getCategoryById(categoryId: String): Result<MenuCategory?> {
        return try {
            val snapshot = categoriesCollection.document(categoryId).get().await()
            val dto = snapshot.toCategoryDtoSafely()
            Result.success(CategoryMapper.toDomain(dto))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveCategory(category: MenuCategory): Result<Unit> {
        return try {
            val docId = category.id.ifBlank { categoriesCollection.document().id }
            val finalCategory = category.copy(id = docId, updatedAt = System.currentTimeMillis())
            val dto = CategoryMapper.toDto(finalCategory)
            categoriesCollection.document(docId).set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteCategory(categoryId: String): Result<Unit> {
        return try {
            categoriesCollection.document(categoryId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateCategoryOrder(
        restaurantId: String,
        orderedCategoryIds: List<String>
    ): Result<Unit> {
        return try {
            val batch = firestore.batch()
            orderedCategoryIds.forEachIndexed { index, catId ->
                val ref = categoriesCollection.document(catId)
                batch.update(ref, mapOf("orderIndex" to index, "updatedAt" to System.currentTimeMillis()))
            }
            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
