package com.example.menu

import com.example.data.adapter.menu.LegacyMenuAdapter
import com.example.domain.engine.menu.MenuEngineImpl
import com.example.domain.model.ProductCategory as LegacyProductCategory
import com.example.domain.model.ProductStatus as LegacyProductStatus
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuProductType
import com.example.domain.model.menu.MenuVersion
import com.example.domain.model.menu.MenuVersionStatus
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LegacyMenuIntegrationTest {

    @Test
    fun `test end to end flow publish v2 product and consume via legacy menu adapter`() = runBlocking {
        // 1. Merchant crea y publica categorías y productos v2.2
        val categories = listOf(
            MenuCategory(id = "cat_burgers", restaurantId = "rest_01", primaryName = "Hamburguesas Premium")
        )

        val v2Products = listOf(
            MenuProduct(
                id = "prod_bbq",
                restaurantId = "rest_01",
                primaryCategoryId = "cat_burgers",
                name = "BBQ Bacon Burger",
                description = "Carne de res con tocineta y salsa BBQ",
                basePrice = 280.0,
                imageUrl = "https://storage.googleapis.com/images/bbq.jpg",
                galleryImages = listOf("https://storage.googleapis.com/images/bbq1.jpg"),
                productType = MenuProductType.SINGLE_ITEM,
                status = MenuProductStatus.ACTIVE,
                variantIds = emptyList(), // Simula ausencia/futuras variantes de forma segura
                optionGroupIds = emptyList()
            )
        )

        val publishedVersion = MenuVersion(
            id = "ver_01",
            restaurantId = "rest_01",
            version = 1L,
            status = MenuVersionStatus.PUBLISHED
        )

        val menuEngine = MenuEngineImpl(
            categoryRepository = FakeCategoryRepo(categories),
            productRepository = FakeProductRepo(v2Products),
            versionRepository = FakeVersionRepo(publishedVersion)
        )

        // 2. ViewModel legado consume getPublishedLegacyProductsForCustomer()
        val legacyProducts = menuEngine.getPublishedLegacyProductsForCustomer("rest_01").first()

        // 3. Verificación de renderizado y mapeo sin crash
        assertEquals(1, legacyProducts.size)
        val legacyProd = legacyProducts.first()

        assertEquals("prod_bbq", legacyProd.id)
        assertEquals("rest_01", legacyProd.businessId)
        assertEquals("BBQ Bacon Burger", legacyProd.name)
        assertEquals(280.0, legacyProd.price, 0.001)
        assertEquals("Hamburguesas Premium", legacyProd.categoryName)
        assertEquals(LegacyProductStatus.ACTIVE, legacyProd.status)
        assertEquals("C$ 280", legacyProd.formattedPrice)
        assertEquals("https://storage.googleapis.com/images/bbq.jpg", legacyProd.imageUrl)
    }

    @Test
    fun `test degradation strategy for unmappable legacy status ARCHIVED and COMBO type`() {
        val archivedComboProduct = MenuProduct(
            id = "combo_01",
            restaurantId = "rest_01",
            primaryCategoryId = "cat_combos",
            name = "Super Combo Familiar",
            basePrice = 850.0,
            productType = MenuProductType.COMBO,
            status = MenuProductStatus.ARCHIVED
        )

        val legacyProduct = LegacyMenuAdapter.toLegacyProduct(archivedComboProduct, categoryName = "")

        // ARCHIVED -> INACTIVE
        assertEquals(LegacyProductStatus.INACTIVE, legacyProduct.status)
        // COMBO -> LegacyProductCategory.COMBO
        assertEquals(LegacyProductCategory.COMBO, legacyProduct.category)
        // Prefijo fallback si categoryName está vacío
        assertTrue(legacyProduct.categoryName.startsWith("[Combo]"))
    }
}
