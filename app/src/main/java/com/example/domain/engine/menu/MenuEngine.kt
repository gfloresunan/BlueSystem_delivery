package com.example.domain.engine.menu

import com.example.data.adapter.menu.LegacyMenuAdapter
import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.data.repository.menu.MenuWriteCoordinator
import com.example.domain.model.Product as LegacyProduct
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuValidationException
import com.example.domain.model.menu.MenuVersion
import com.example.domain.model.menu.MenuVersionStatus
import com.example.domain.repository.menu.IMenuCategoryRepository
import com.example.domain.repository.menu.IMenuProductRepository
import com.example.domain.repository.menu.IMenuVersionRepository
import com.example.domain.validation.menu.MenuCoreValidator
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf

data class AdminMenuTree(
    val restaurantId: String,
    val categories: List<MenuCategory>,
    val productsByCategory: Map<String, List<MenuProduct>>,
    val latestVersion: MenuVersion?
)

data class CustomerMenuTree(
    val restaurantId: String,
    val categories: List<MenuCategory>,
    val productsByCategory: Map<String, List<MenuProduct>>,
    val version: MenuVersion,
    val isStaleFallback: Boolean = false
)

interface IMenuEngine {
    fun assembleMenuTreeForAdmin(restaurantId: String): Flow<AdminMenuTree>
    fun getPublishedMenuForCustomer(restaurantId: String): Flow<CustomerMenuTree>
    fun getPublishedLegacyProductsForCustomer(restaurantId: String): Flow<List<LegacyProduct>>
    suspend fun publishMenu(restaurantId: String, generatedBy: String): Result<MenuVersion>
}

/**
 * Servidor de Dominio: MenuEngineImpl (Sprint 13B.1D Hardened)
 *
 * RESPONSABILIDAD ÚNICA:
 * - Ensamblaje del árbol de menú (Admin & Customer Composite Read).
 * - Validación del puntero currentMenuVersionId para prevenir servir menús desactualizados/stale.
 * - Coordinación del proceso de publicación de versiones.
 * - Integración con LegacyMenuAdapter para consumo retrocompatible.
 */
class MenuEngineImpl(
    private val categoryRepository: IMenuCategoryRepository,
    private val productRepository: IMenuProductRepository,
    private val versionRepository: IMenuVersionRepository,
    private val validationEngine: IValidationEngine = ValidationEngineImpl(),
    private val writeCoordinator: MenuWriteCoordinator? = null
) : IMenuEngine {

    private val safeCoordinator: MenuWriteCoordinator by lazy {
        writeCoordinator ?: MenuWriteCoordinator()
    }

    override fun assembleMenuTreeForAdmin(restaurantId: String): Flow<AdminMenuTree> {
        if (restaurantId.isBlank()) {
            return flowOf(AdminMenuTree("", emptyList(), emptyMap(), null))
        }

        return combine(
            categoryRepository.getCategoriesFlow(restaurantId),
            productRepository.getProductsFlow(restaurantId),
            versionRepository.getLatestMenuVersionFlow(restaurantId)
        ) { categories, products, latestVersion ->
            val productsGrouped = products.groupBy { it.primaryCategoryId }
            AdminMenuTree(
                restaurantId = restaurantId,
                categories = categories,
                productsByCategory = productsGrouped,
                latestVersion = latestVersion
            )
        }
    }

    override fun getPublishedMenuForCustomer(restaurantId: String): Flow<CustomerMenuTree> {
        if (restaurantId.isBlank()) {
            return flowOf(CustomerMenuTree("", emptyList(), emptyMap(), MenuVersion()))
        }

        return combine(
            categoryRepository.getCategoriesFlow(restaurantId),
            productRepository.getProductsFlow(restaurantId),
            versionRepository.getLatestMenuVersionFlow(restaurantId)
        ) { categories, products, latestVersion ->
            // Validación de puntero de versión publicada
            val isVersionValid = latestVersion != null && latestVersion.status == MenuVersionStatus.PUBLISHED
            val isStale = !isVersionValid

            val activeCategories = categories.filter { it.isActive }
            val activeProducts = products.filter { it.status == MenuProductStatus.ACTIVE }
            val productsGrouped = activeProducts.groupBy { it.primaryCategoryId }

            CustomerMenuTree(
                restaurantId = restaurantId,
                categories = activeCategories,
                productsByCategory = productsGrouped,
                version = latestVersion ?: MenuVersion(restaurantId = restaurantId, status = MenuVersionStatus.PUBLISHED),
                isStaleFallback = isStale
            )
        }
    }

    override fun getPublishedLegacyProductsForCustomer(restaurantId: String): Flow<List<LegacyProduct>> {
        if (restaurantId.isBlank()) {
            return flowOf(emptyList())
        }

        return combine(
            categoryRepository.getCategoriesFlow(restaurantId),
            productRepository.getProductsFlow(restaurantId)
        ) { categories, products ->
            val activeCategoriesMap = categories.filter { it.isActive }.associateBy { it.id }
            val activeProducts = products.filter { it.status == MenuProductStatus.ACTIVE }

            activeProducts.map { v2Prod ->
                val categoryName = activeCategoriesMap[v2Prod.primaryCategoryId]?.primaryName ?: ""
                LegacyMenuAdapter.toLegacyProduct(v2Prod, categoryName)
            }
        }
    }

    override suspend fun publishMenu(restaurantId: String, generatedBy: String): Result<MenuVersion> {
        return try {
            if (restaurantId.isBlank()) {
                return Result.failure(IllegalArgumentException("El restaurantId no puede estar vacío."))
            }

            val categories = categoryRepository.getCategoriesFlow(restaurantId).first()
            val products = productRepository.getProductsFlow(restaurantId).first()

            val validationResult = validationEngine.validateMenuForPublishing(categories, products)
            if (!validationResult.isValid) {
                return Result.failure(MenuValidationException(validationResult.errors))
            }

            val latestVersionObj = versionRepository.getLatestMenuVersionFlow(restaurantId).first()
            val newVersionNumber = (latestVersionObj?.version ?: 0L) + 1L

            val checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(categories, products)

            val newVersion = MenuVersion(
                id = "ver_${System.currentTimeMillis()}",
                restaurantId = restaurantId,
                version = newVersionNumber,
                checksum = checksum,
                generatedAt = System.currentTimeMillis(),
                publishedAt = System.currentTimeMillis(),
                generatedBy = generatedBy,
                schemaVersion = "2.2.0",
                menuHash = checksum,
                status = MenuVersionStatus.PUBLISHED
            )

            val batchResult = safeCoordinator.publishMenuBatch(
                restaurantId = restaurantId,
                menuVersion = newVersion,
                categories = categories,
                products = products,
                expectedServerVersion = latestVersionObj?.version
            )

            if (batchResult.isSuccess) {
                Result.success(newVersion)
            } else {
                Result.failure(batchResult.exceptionOrNull() ?: Exception("Error en publicación transaccional batch"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
