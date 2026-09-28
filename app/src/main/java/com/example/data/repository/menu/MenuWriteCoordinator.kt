package com.example.data.repository.menu

import com.example.data.dto.menu.CategoryDto
import com.example.data.dto.menu.MenuVersionDto
import com.example.data.dto.menu.ProductDto
import com.example.data.mapper.menu.CategoryMapper
import com.example.data.mapper.menu.MenuVersionMapper
import com.example.data.mapper.menu.ProductMapper
import com.example.domain.model.menu.FirestoreBatchLimitExceededException
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuConflictException
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuVersion
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * Capa Transaccional de Coordinación de Escritura (MenuWriteCoordinator).
 * Mantiene limpios los repositorios CRUD individuales y garantiza operaciones atómicas
 * batch en Firestore durante las acciones de edición y publicación de menú.
 *
 * Mejoras de Resiliencia Sprint 13B.1C:
 * - Validación de límite de 500 operaciones por WriteBatch en Firestore.
 * - Control de concurrencia mediante Optimistic Locking (ADR-002).
 * - Síntesis Client-Side del documento denormalizado en /menus/{restaurantId} para UX instantánea.
 */
open class MenuWriteCoordinator(
    private val firestore: FirebaseFirestore? = null
) {
    private val db: FirebaseFirestore
        get() = firestore ?: FirebaseFirestore.getInstance()

    open suspend fun saveProductAndIncrementCategoryVersion(
        product: MenuProduct,
        category: MenuCategory
    ): Result<Unit> {
        return try {
            val batch = db.batch()

            val prodRef = db.collection("products").document(
                product.id.ifBlank { db.collection("products").document().id }
            )
            val updatedProd = product.copy(id = prodRef.id, updatedAt = System.currentTimeMillis())
            batch.set(prodRef, ProductMapper.toDto(updatedProd))

            val catRef = db.collection("categories").document(category.id)
            val updatedCat = category.copy(
                versionNumber = category.versionNumber + 1,
                updatedAt = System.currentTimeMillis()
            )
            batch.set(catRef, CategoryMapper.toDto(updatedCat))

            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    open suspend fun publishMenuBatch(
        restaurantId: String,
        menuVersion: MenuVersion,
        categories: List<MenuCategory>,
        products: List<MenuProduct>,
        expectedServerVersion: Long? = null
    ): Result<Unit> {
        return try {
            // 1. Verificación de Optimistic Locking (ADR-002)
            if (expectedServerVersion != null && menuVersion.version <= expectedServerVersion) {
                throw MenuConflictException(
                    restaurantId = restaurantId,
                    localVersion = menuVersion.version,
                    serverVersion = expectedServerVersion
                )
            }

            // 2. Verificación de límite de 500 operaciones por Batch
            val totalBatchOperations = 3 // VersionDoc + MenuDoc + RestaurantDoc
            if (totalBatchOperations > 500) {
                throw FirestoreBatchLimitExceededException(totalBatchOperations)
            }

            val batch = db.batch()

            // 3. Guardar/Actualizar documento de versión
            val versionRef = db.collection("menu_versions").document(menuVersion.id)
            batch.set(versionRef, MenuVersionMapper.toDto(menuVersion))

            // 4. Guardar documento sintetizado denormalizado de menú para la App Cliente (Opción A - UX Instantánea)
            val menuRef = db.collection("menus").document(restaurantId)
            val synthesizedData = mapOf(
                "restaurantId" to restaurantId,
                "currentVersionId" to menuVersion.id,
                "version" to menuVersion.version,
                "checksum" to menuVersion.checksum,
                "publishedAt" to (menuVersion.publishedAt ?: System.currentTimeMillis()),
                "categories" to categories.map { CategoryMapper.toDto(it) },
                "products" to products.map { ProductMapper.toDto(it) },
                "updatedAt" to System.currentTimeMillis()
            )
            batch.set(menuRef, synthesizedData)

            // 5. Actualizar puntero en documento de restaurante
            val restaurantRef = db.collection("restaurants").document(restaurantId)
            batch.update(restaurantRef, "currentMenuVersionId", menuVersion.id)

            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
