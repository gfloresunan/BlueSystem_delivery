package com.example.menu

import com.example.domain.engine.menu.MenuEngineImpl
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuVersion
import com.example.domain.repository.menu.IMenuCategoryRepository
import com.example.domain.repository.menu.IMenuProductRepository
import com.example.domain.repository.menu.IMenuVersionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeCategoryRepo(private val categories: List<MenuCategory>) : IMenuCategoryRepository {
    override fun getCategoriesFlow(restaurantId: String): Flow<List<MenuCategory>> = flowOf(categories)
    override suspend fun getCategoryById(categoryId: String): Result<MenuCategory?> = Result.success(categories.find { it.id == categoryId })
    override suspend fun saveCategory(category: MenuCategory): Result<Unit> = Result.success(Unit)
    override suspend fun deleteCategory(categoryId: String): Result<Unit> = Result.success(Unit)
    override suspend fun updateCategoryOrder(restaurantId: String, orderedCategoryIds: List<String>): Result<Unit> = Result.success(Unit)
}

class FakeProductRepo(private val products: List<MenuProduct>) : IMenuProductRepository {
    override fun getProductsFlow(restaurantId: String): Flow<List<MenuProduct>> = flowOf(products)
    override fun getProductsByCategoryFlow(restaurantId: String, categoryId: String): Flow<List<MenuProduct>> =
        flowOf(products.filter { it.primaryCategoryId == categoryId })
    override fun getProductsByGlobalCategoryFlow(globalCategoryId: String): Flow<List<MenuProduct>> =
        flowOf(products.filter { it.globalCategoryId == globalCategoryId })
    override suspend fun getProductById(productId: String): Result<MenuProduct?> = Result.success(products.find { it.id == productId })
    override suspend fun saveProduct(product: MenuProduct): Result<Unit> = Result.success(Unit)
    override suspend fun updateProductStatus(productId: String, status: MenuProductStatus): Result<Unit> = Result.success(Unit)
    override suspend fun deleteProduct(productId: String): Result<Unit> = Result.success(Unit)
}

class FakeVersionRepo(private val version: MenuVersion? = null) : IMenuVersionRepository {
    override fun getLatestMenuVersionFlow(restaurantId: String): Flow<MenuVersion?> = flowOf(version)
    override suspend fun saveMenuVersion(menuVersion: MenuVersion): Result<Unit> = Result.success(Unit)
    override suspend fun publishMenuVersion(restaurantId: String, menuVersionId: String): Result<Unit> = Result.success(Unit)
}

class MenuEngineTest {

    @Test
    fun `test assembleMenuTreeForAdmin returns full tree including inactive items`() = runBlocking {
        val categories = listOf(
            MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Cat 1", isActive = true),
            MenuCategory(id = "c2", restaurantId = "r1", primaryName = "Cat 2", isActive = false)
        )
        val products = listOf(
            MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "Prod 1", status = MenuProductStatus.ACTIVE),
            MenuProduct(id = "p2", restaurantId = "r1", primaryCategoryId = "c2", name = "Prod 2", status = MenuProductStatus.INACTIVE)
        )

        val menuEngine = MenuEngineImpl(
            categoryRepository = FakeCategoryRepo(categories),
            productRepository = FakeProductRepo(products),
            versionRepository = FakeVersionRepo()
        )

        val adminTree = menuEngine.assembleMenuTreeForAdmin("r1").first()

        assertEquals("r1", adminTree.restaurantId)
        assertEquals(2, adminTree.categories.size)
        assertEquals(1, adminTree.productsByCategory["c1"]?.size)
        assertEquals(1, adminTree.productsByCategory["c2"]?.size)
    }

    @Test
    fun `test getPublishedMenuForCustomer filters active categories and products only`() = runBlocking {
        val categories = listOf(
            MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Cat 1", isActive = true),
            MenuCategory(id = "c2", restaurantId = "r1", primaryName = "Cat 2", isActive = false)
        )
        val products = listOf(
            MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "Prod 1", status = MenuProductStatus.ACTIVE),
            MenuProduct(id = "p2", restaurantId = "r1", primaryCategoryId = "c1", name = "Prod 2", status = MenuProductStatus.INACTIVE)
        )

        val menuEngine = MenuEngineImpl(
            categoryRepository = FakeCategoryRepo(categories),
            productRepository = FakeProductRepo(products),
            versionRepository = FakeVersionRepo()
        )

        val customerTree = menuEngine.getPublishedMenuForCustomer("r1").first()

        assertEquals(1, customerTree.categories.size)
        assertEquals("Cat 1", customerTree.categories.first().primaryName)
        assertEquals(1, customerTree.productsByCategory["c1"]?.size)
        assertEquals("Prod 1", customerTree.productsByCategory["c1"]?.first()?.name)
    }

    @Test
    fun `test getPublishedLegacyProductsForCustomer returns legacy models via adapter`() = runBlocking {
        val categories = listOf(MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Hamburguesas", isActive = true))
        val products = listOf(MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "BBQ Burger", basePrice = 250.0, status = MenuProductStatus.ACTIVE))

        val menuEngine = MenuEngineImpl(
            categoryRepository = FakeCategoryRepo(categories),
            productRepository = FakeProductRepo(products),
            versionRepository = FakeVersionRepo()
        )

        val legacyProducts = menuEngine.getPublishedLegacyProductsForCustomer("r1").first()

        assertEquals(1, legacyProducts.size)
        val legacyProd = legacyProducts.first()
        assertEquals("p1", legacyProd.id)
        assertEquals("BBQ Burger", legacyProd.name)
        assertEquals("Hamburguesas", legacyProd.categoryName)
        assertEquals("C$ 250", legacyProd.formattedPrice)
    }
}
