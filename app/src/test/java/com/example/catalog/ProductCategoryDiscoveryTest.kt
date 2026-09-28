package com.example.catalog

import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import org.junit.Assert.*
import org.junit.Test

class ProductCategoryDiscoveryTest {

    private val sampleCategories = listOf(
        Category(id = "cat_fritanga", name = "Fritanga NICA", type = "PRODUCT", slug = "fritanga-nica"),
        Category(id = "cat_restaurantes", name = "Restaurantes", type = "BUSINESS", slug = "restaurantes"),
        Category(id = "cat_bebidas", name = "Bebidas", type = "PRODUCT", slug = "bebidas")
    )

    private val sampleProducts = listOf(
        Product(
            id = "prod_1",
            name = "FritoTacos",
            description = "Tacos mixto de Cerdo, Res y Pollo",
            price = 200.0,
            originalPrice = 300.0,
            categoryName = "Fritanga NICA",
            categoryId = "cat_fritanga",
            businessId = "biz_fritoni",
            isSpicy = true,
            spicyLevel = 1,
            status = ProductStatus.ACTIVE
        ),
        Product(
            id = "prod_2",
            name = "El Pike",
            description = "Deliciosas papas con carne",
            price = 200.0,
            categoryName = "Fritanga NICA",
            categoryId = "cat_fritanga",
            businessId = "biz_fritoni",
            status = ProductStatus.ACTIVE
        ),
        Product(
            id = "prod_3",
            name = "Macanazo",
            description = "Carne desmenuzada con queso",
            price = 220.0,
            originalPrice = 300.0,
            categoryName = "Fritanga NICA",
            categoryId = "cat_fritanga",
            businessId = "biz_fritoni",
            isSpicy = true,
            spicyLevel = 2,
            status = ProductStatus.ACTIVE
        ),
        Product(
            id = "prod_4",
            name = "Quezuda",
            description = "Enchilada de Carne llena de mozarela",
            price = 200.0,
            categoryName = "Fritanga NICA",
            categoryId = "cat_fritanga",
            businessId = "biz_fritoni",
            status = ProductStatus.ACTIVE
        ),
        Product(
            id = "prod_5_inactive",
            name = "Fritanga Inactiva",
            categoryName = "Fritanga NICA",
            categoryId = "cat_fritanga",
            businessId = "biz_fritoni",
            status = ProductStatus.INACTIVE
        ),
        Product(
            id = "prod_6_hidden",
            name = "Fritanga Oculta",
            categoryName = "Fritanga NICA",
            categoryId = "cat_fritanga",
            businessId = "biz_fritoni",
            isHidden = true,
            status = ProductStatus.ACTIVE
        ),
        Product(
            id = "prod_7_other",
            name = "Coca Cola 2L",
            categoryName = "Bebidas",
            categoryId = "cat_bebidas",
            businessId = "biz_fritoni",
            status = ProductStatus.ACTIVE
        )
    )

    private fun resolveCategoryDomain(filter: String, categories: List<Category>): Boolean {
        val catNorm = filter.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        if (catNorm.isEmpty()) return false
        val catType = categories.firstOrNull { cat ->
            cat.name.trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                .equals(catNorm) ||
            cat.slug.trim().lowercase().equals(catNorm)
        }?.type?.trim()?.uppercase() ?: ""
        return catType == "PRODUCT" || catType == "PRODUCTO"
    }

    private fun filterProductsForCategory(
        filter: String,
        allProducts: List<Product>,
        isProductDomain: Boolean
    ): List<Product> {
        val catNorm = filter.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        if (!isProductDomain || catNorm.isEmpty()) return emptyList()

        return allProducts.filter { prod ->
            val isActive = prod.status != ProductStatus.INACTIVE && !prod.isHidden
            if (!isActive) return@filter false

            val prodCatNorm = prod.categoryName.trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val prodSubCatNorm = prod.subCategoryName.trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val prodCatIdNorm = prod.categoryId.trim().lowercase()

            (prodCatNorm.isNotEmpty() && (prodCatNorm.contains(catNorm) || catNorm.contains(prodCatNorm))) ||
            (prodSubCatNorm.isNotEmpty() && (prodSubCatNorm.contains(catNorm) || catNorm.contains(prodSubCatNorm))) ||
            (prodCatIdNorm.isNotEmpty() && prodCatIdNorm.contains(catNorm))
        }.distinctBy { it.id }
    }

    @Test
    fun test_01_CategoryProductDiscovery_FritangaNICA_ReturnsAllRealProducts() {
        val isProductDomain = resolveCategoryDomain("Fritanga NICA", sampleCategories)
        assertTrue("La categoría 'Fritanga NICA' debe ser de dominio PRODUCT", isProductDomain)

        val results = filterProductsForCategory("Fritanga NICA", sampleProducts, isProductDomain)
        assertEquals("Deben existir 4 productos activos de Fritanga NICA", 4, results.size)

        val productNames = results.map { it.name }
        assertTrue(productNames.contains("FritoTacos"))
        assertTrue(productNames.contains("El Pike"))
        assertTrue(productNames.contains("Macanazo"))
        assertTrue(productNames.contains("Quezuda"))
    }

    @Test
    fun test_02_ProductsFromSameBusiness_AreNotDeduplicated() {
        val isProductDomain = resolveCategoryDomain("Fritanga NICA", sampleCategories)
        val results = filterProductsForCategory("Fritanga NICA", sampleProducts, isProductDomain)

        // Todos pertenecen al mismo business 'biz_fritoni', pero son 4 productos diferentes
        val businessIds = results.map { it.businessId }.distinct()
        assertEquals(1, businessIds.size)
        assertEquals("biz_fritoni", businessIds.first())
        assertEquals(4, results.size)
    }

    @Test
    fun test_03_InactiveAndHiddenProducts_AreExcluded() {
        val isProductDomain = resolveCategoryDomain("Fritanga NICA", sampleCategories)
        val results = filterProductsForCategory("Fritanga NICA", sampleProducts, isProductDomain)

        val productIds = results.map { it.id }
        assertFalse(productIds.contains("prod_5_inactive"))
        assertFalse(productIds.contains("prod_6_hidden"))
    }

    @Test
    fun test_04_OtherCategoryProducts_AreExcluded() {
        val isProductDomain = resolveCategoryDomain("Fritanga NICA", sampleCategories)
        val results = filterProductsForCategory("Fritanga NICA", sampleProducts, isProductDomain)

        val productIds = results.map { it.id }
        assertFalse("Coca Cola no debe estar en Fritanga NICA", productIds.contains("prod_7_other"))
    }

    @Test
    fun test_05_CategoryBusinessDomain_DoesNotReturnProductDiscovery() {
        val isProductDomain = resolveCategoryDomain("Restaurantes", sampleCategories)
        assertFalse("Restaurantes debe ser de dominio BUSINESS", isProductDomain)

        val results = filterProductsForCategory("Restaurantes", sampleProducts, isProductDomain)
        assertTrue("No debe haber productos en el flujo de categoría BUSINESS", results.isEmpty())
    }

    @Test
    fun test_06_SwitchingCategories_ClearsOldProducts() {
        val fritangaDomain = resolveCategoryDomain("Fritanga NICA", sampleCategories)
        val fritangaResults = filterProductsForCategory("Fritanga NICA", sampleProducts, fritangaDomain)
        assertEquals(4, fritangaResults.size)

        val bebidasDomain = resolveCategoryDomain("Bebidas", sampleCategories)
        val bebidasResults = filterProductsForCategory("Bebidas", sampleProducts, bebidasDomain)
        assertEquals(1, bebidasResults.size)
        assertEquals("Coca Cola 2L", bebidasResults.first().name)
    }

    @Test
    fun test_07_ClearFilter_ReturnsEmptyProductList() {
        val isProductDomain = resolveCategoryDomain("", sampleCategories)
        assertFalse(isProductDomain)

        val results = filterProductsForCategory("", sampleProducts, isProductDomain)
        assertTrue(results.isEmpty())
    }

    @Test
    fun test_08_ProductCardDataIntegrity_HasDiscountAndSpicy() {
        val isProductDomain = resolveCategoryDomain("Fritanga NICA", sampleCategories)
        val results = filterProductsForCategory("Fritanga NICA", sampleProducts, isProductDomain)

        val fritoTacos = results.find { it.name == "FritoTacos" }!!
        assertTrue(fritoTacos.hasDiscount)
        assertEquals(33, fritoTacos.discountPercentage)
        assertEquals("C$ 200", fritoTacos.formattedPrice)
        assertEquals("C$ 300", fritoTacos.formattedOriginalPrice)
        assertTrue(fritoTacos.isSpicy)
        assertEquals(1, fritoTacos.spicyLevel)

        val macanazo = results.find { it.name == "Macanazo" }!!
        assertTrue(macanazo.hasDiscount)
        assertEquals(26, macanazo.discountPercentage)
        assertEquals(2, macanazo.spicyLevel)
    }
}
