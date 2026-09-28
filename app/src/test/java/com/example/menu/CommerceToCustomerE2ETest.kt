package com.example.menu

import com.example.data.adapter.menu.LegacyMenuAdapter
import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.data.repository.menu.MenuWriteCoordinator
import com.example.domain.engine.menu.CustomerAvailabilityFilter
import com.example.domain.engine.menu.MenuDiffEngineImpl
import com.example.domain.engine.menu.MenuEngineImpl
import com.example.domain.engine.menu.MenuRollbackCoordinatorImpl
import com.example.domain.engine.menu.PromotionEngineImpl
import com.example.domain.engine.menu.PromotionEvaluationContext
import com.example.domain.model.menu.*
import com.example.domain.repository.menu.IMenuCategoryRepository
import com.example.domain.repository.menu.IMenuProductRepository
import com.example.domain.repository.menu.IMenuVersionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MutableCategoryRepo : IMenuCategoryRepository {
    val memory = mutableListOf<MenuCategory>()
    override fun getCategoriesFlow(restaurantId: String): Flow<List<MenuCategory>> = flowOf(memory.filter { it.restaurantId == restaurantId })
    override suspend fun getCategoryById(categoryId: String): Result<MenuCategory?> = Result.success(memory.find { it.id == categoryId })
    override suspend fun saveCategory(category: MenuCategory): Result<Unit> {
        memory.removeAll { it.id == category.id }
        memory.add(category)
        return Result.success(Unit)
    }
    override suspend fun deleteCategory(categoryId: String): Result<Unit> {
        memory.removeAll { it.id == categoryId }
        return Result.success(Unit)
    }
    override suspend fun updateCategoryOrder(restaurantId: String, orderedCategoryIds: List<String>): Result<Unit> = Result.success(Unit)
}

class MutableProductRepo : IMenuProductRepository {
    val memory = mutableListOf<MenuProduct>()
    override fun getProductsFlow(restaurantId: String): Flow<List<MenuProduct>> = flowOf(memory.filter { it.restaurantId == restaurantId })
    override fun getProductsByCategoryFlow(restaurantId: String, categoryId: String): Flow<List<MenuProduct>> =
        flowOf(memory.filter { it.restaurantId == restaurantId && it.primaryCategoryId == categoryId })
    override fun getProductsByGlobalCategoryFlow(globalCategoryId: String): Flow<List<MenuProduct>> =
        flowOf(memory.filter { it.globalCategoryId == globalCategoryId })
    override suspend fun getProductById(productId: String): Result<MenuProduct?> = Result.success(memory.find { it.id == productId })
    override suspend fun saveProduct(product: MenuProduct): Result<Unit> {
        memory.removeAll { it.id == product.id }
        memory.add(product)
        return Result.success(Unit)
    }
    override suspend fun updateProductStatus(productId: String, status: MenuProductStatus): Result<Unit> {
        val idx = memory.indexOfFirst { it.id == productId }
        if (idx >= 0) memory[idx] = memory[idx].copy(status = status)
        return Result.success(Unit)
    }
    override suspend fun deleteProduct(productId: String): Result<Unit> {
        memory.removeAll { it.id == productId }
        return Result.success(Unit)
    }
}

class MutableVersionRepo : IMenuVersionRepository {
    var version: MenuVersion? = null
    override fun getLatestMenuVersionFlow(restaurantId: String): Flow<MenuVersion?> = flowOf(version)
    override suspend fun saveMenuVersion(menuVersion: MenuVersion): Result<Unit> {
        version = menuVersion
        return Result.success(Unit)
    }
    override suspend fun publishMenuVersion(restaurantId: String, menuVersionId: String): Result<Unit> = Result.success(Unit)
}

class FakeWriteCoordinator : MenuWriteCoordinator(null) {
    override suspend fun publishMenuBatch(
        restaurantId: String,
        menuVersion: MenuVersion,
        categories: List<MenuCategory>,
        products: List<MenuProduct>,
        expectedServerVersion: Long?
    ): Result<Unit> {
        return Result.success(Unit)
    }
}

class CommerceToCustomerE2ETest {

    private val categoryRepo = MutableCategoryRepo()
    private val productRepo = MutableProductRepo()
    private val versionRepo = MutableVersionRepo()
    private val snapshotRepo = FakeSnapshotRepo()
    private val auditRepo = FakeAuditRepo()
    private val fakeWriteCoordinator = FakeWriteCoordinator()

    private val menuEngine = MenuEngineImpl(categoryRepo, productRepo, versionRepo, writeCoordinator = fakeWriteCoordinator)
    private val diffEngine = MenuDiffEngineImpl()
    private val rollbackCoordinator = MenuRollbackCoordinatorImpl(snapshotRepo, auditRepo)
    private val promotionEngine = PromotionEngineImpl()

    @Test
    fun `Case 1 - Commerce creates product, publishes menu, customer sees new product`() = runBlocking {
        val cat = MenuCategory(id = "cat1", primaryName = "Hamburguesas", restaurantId = "rest1", isActive = true)
        val prod = MenuProduct(id = "p1", name = "Super Burger", basePrice = 150.0, primaryCategoryId = "cat1", restaurantId = "rest1", status = MenuProductStatus.ACTIVE)

        categoryRepo.saveCategory(cat)
        productRepo.saveProduct(prod)

        val publishResult = menuEngine.publishMenu("rest1", "user_chef")

        assertTrue(publishResult.isSuccess)

        val customerTree = menuEngine.getPublishedMenuForCustomer("rest1").first()
        val productsInCat = customerTree.productsByCategory["cat1"] ?: emptyList()

        assertEquals(1, productsInCat.size)
        assertEquals("Super Burger", productsInCat[0].name)

        // Cliente app delivery consume menú sintetizado publicado via LegacyMenuAdapter
        val legacyProduct = LegacyMenuAdapter.toLegacyProduct(productsInCat[0], "Hamburguesas")
        assertEquals("Super Burger", legacyProduct.name)
    }

    @Test
    fun `Case 2 - Commerce modifies price, publishes menu, customer receives new price`() = runBlocking {
        val cat = MenuCategory(id = "cat1", primaryName = "Pizzas", restaurantId = "rest1", isActive = true)
        val prodV1 = MenuProduct(id = "p1", primaryCategoryId = "cat1", name = "Pizza Pepperoni", basePrice = 200.0, restaurantId = "rest1", status = MenuProductStatus.ACTIVE)

        categoryRepo.saveCategory(cat)
        productRepo.saveProduct(prodV1)
        menuEngine.publishMenu("rest1", "user_chef")

        val customerTreeV1 = menuEngine.getPublishedMenuForCustomer("rest1").first()
        val prodCustomerV1 = customerTreeV1.productsByCategory["cat1"]?.first()
        assertEquals(200.0, prodCustomerV1?.basePrice ?: 0.0, 0.001)

        // Modificar precio a 220.0 y re-publicar
        val prodV2 = prodV1.copy(basePrice = 220.0)
        productRepo.saveProduct(prodV2)
        menuEngine.publishMenu("rest1", "user_chef")

        val customerTreeV2 = menuEngine.getPublishedMenuForCustomer("rest1").first()
        val prodCustomerV2 = customerTreeV2.productsByCategory["cat1"]?.first()
        assertEquals(220.0, prodCustomerV2?.basePrice ?: 0.0, 0.001)

        // Diff Engine verifica cambio de precio
        val snapV1 = MenuSnapshot(semanticVersion = "v1", products = listOf(prodV1))
        val snapV2 = MenuSnapshot(semanticVersion = "v2", products = listOf(prodV2))
        val diff = diffEngine.calculateDiff(snapV1, snapV2)

        assertEquals(1, diff.priceChanges.size)
        assertEquals(200.0, diff.priceChanges[0].oldPrice, 0.001)
        assertEquals(220.0, diff.priceChanges[0].newPrice, 0.001)
    }

    @Test
    fun `Case 3 - Commerce archives product, publishes menu, customer no longer sees it`() = runBlocking {
        val cat = MenuCategory(id = "cat1", primaryName = "Generales", restaurantId = "rest1", isActive = true)
        val prod = MenuProduct(id = "p1", primaryCategoryId = "cat1", name = "Producto Temporal", basePrice = 100.0, restaurantId = "rest1", status = MenuProductStatus.ARCHIVED)

        categoryRepo.saveCategory(cat)
        productRepo.saveProduct(prod)

        menuEngine.publishMenu("rest1", "user_chef")

        val customerTree = menuEngine.getPublishedMenuForCustomer("rest1").first()
        val productsInCat = customerTree.productsByCategory["cat1"] ?: emptyList()

        // El menú del cliente excluye productos ARCHIVED
        assertTrue(productsInCat.none { it.id == "p1" })
    }

    @Test
    fun `Case 4 - Out of Stock condition, CustomerAvailabilityFilter marks item Out of Stock`() {
        val prod = MenuProduct(id = "p1", name = "Pollo Frito", basePrice = 180.0, status = MenuProductStatus.OUT_OF_STOCK)

        val filteredWrappers = CustomerAvailabilityFilter.filterProducts(products = listOf(prod))

        assertEquals(1, filteredWrappers.size)
        assertEquals(false, filteredWrappers[0].isAvailableForOrder)
        assertEquals("OUT_OF_STOCK", filteredWrappers[0].unavailableReason)
    }

    @Test
    fun `Case 5 - Active promotion applied, Promotion Engine calculates discount for customer`() {
        val promo = MenuPromotion(
            id = "prom1",
            restaurantId = "rest1",
            name = "Verano 20% OFF",
            discountType = DiscountType.PERCENTAGE,
            discountValue = 20.0,
            rule = PromotionRule(minOrderAmount = 100.0)
        )

        val promoContext = PromotionEvaluationContext(
            restaurantId = "rest1",
            cartSubtotal = 500.0
        )

        val result = promotionEngine.evaluatePromotions(listOf(promo), promoContext)

        assertEquals(100.0, result.totalDiscountAmount, 0.001) // 500 * 0.20 = 100
        assertEquals(1, result.appliedPromotions.size)
    }

    @Test
    fun `Case 6 - Rollback restores previous version, customer sees previous state`() = runBlocking {
        val v1Products = listOf(MenuProduct(id = "p1", name = "Combo Original", basePrice = 150.0))
        val v1Checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(emptyList(), v1Products, emptyList())

        val snapshotV1 = MenuSnapshot(
            id = "snap_v1",
            restaurantId = "rest1",
            semanticVersion = "v1.0.0",
            sha256Checksum = v1Checksum,
            products = v1Products
        )
        snapshotRepo.saveSnapshot(snapshotV1)

        val rollbackResult = rollbackCoordinator.executeRollback(
            restaurantId = "rest1",
            targetSnapshot = snapshotV1,
            userId = "admin_user",
            reason = "Restaurar estado previo"
        )

        assertTrue(rollbackResult.isSuccess)
        assertTrue(rollbackResult.checksumVerified)
        assertEquals("v1.0.0", rollbackResult.restoredVersion)
    }
}
