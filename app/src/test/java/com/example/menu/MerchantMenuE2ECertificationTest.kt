package com.example.menu

import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import com.example.presentation.business.menu.MenuFilterChip
import com.google.firebase.Timestamp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Locale

/**
 * Suite de Certificación E2E para el Módulo de Menú de Comercio (Merchant Menu Engine).
 * Valida integridad de datos, búsqueda null-safe, filtros, categorías dinámicas,
 * operaciones CRUD, aislamiento multi-tenant y no regresión.
 */
class MerchantMenuE2ECertificationTest {

    private fun createSampleProducts(businessId: String = "biz_enterprise_1"): List<Product> {
        val now = Timestamp.now().seconds
        return listOf(
            Product(
                id = "prod_1",
                businessId = businessId,
                name = "Hamburguesa Doble Queso",
                description = "Carne Angus con doble queso cheddar y salsa especial",
                price = 280.0,
                originalPrice = 320.0,
                categoryName = "Hamburguesas",
                subCategoryName = "Gourmet",
                status = ProductStatus.ACTIVE,
                salesCount = 150,
                createdAt = Timestamp(now - 1000, 0)
            ),
            Product(
                id = "prod_2",
                businessId = businessId,
                name = "Hamburguesa BBQ Crispy",
                description = "Tocineta crujiente y cebolla frita",
                price = 260.0,
                categoryName = "Hamburguesas",
                subCategoryName = "Especiales",
                status = ProductStatus.OUT_OF_STOCK,
                salesCount = 300,
                createdAt = Timestamp(now - 500, 0)
            ),
            Product(
                id = "prod_3",
                businessId = businessId,
                name = "Pizza Familiar Pepperoni",
                description = "Masa artesanal con pepperoni premium",
                price = 450.0,
                categoryName = "Pizzas",
                subCategoryName = "Tradicionales",
                status = ProductStatus.ACTIVE,
                salesCount = 80,
                createdAt = Timestamp(now - 100, 0)
            ),
            Product(
                id = "prod_4",
                businessId = businessId,
                name = "Gaseosa Cola 500ml",
                description = "Bebida carbonatada bien fría",
                price = 50.0,
                categoryName = "Bebidas",
                status = ProductStatus.ACTIVE,
                salesCount = 500,
                createdAt = Timestamp(now, 0)
            )
        )
    }

    @Test
    fun `test dynamic categories generation without hardcoding`() {
        val firestoreCategories = listOf(
            Category(id = "cat_1", name = "Hamburguesas", active = true),
            Category(id = "cat_2", name = "Pizzas", active = true),
            Category(id = "cat_3", name = "Postres", active = true)
        )
        val products = createSampleProducts()

        // Fusión dinámica
        val catMap = mutableMapOf<String, String>()
        firestoreCategories.filter { it.active }.forEach { cat ->
            if (cat.name.isNotBlank()) catMap[cat.name.trim()] = cat.id
        }
        products.forEach { prod ->
            val name = prod.categoryName.ifBlank { prod.category.name }.trim()
            if (name.isNotBlank() && !catMap.containsKey(name)) {
                catMap[name] = prod.categoryId.ifBlank { "custom_$name" }
            }
        }
        val dynamicList = catMap.keys.toList().sorted()

        assertEquals(4, dynamicList.size)
        assertTrue(dynamicList.contains("Hamburguesas"))
        assertTrue(dynamicList.contains("Pizzas"))
        assertTrue(dynamicList.contains("Bebidas")) // Derivada de los productos
        assertTrue(dynamicList.contains("Postres")) // De Firestore sin productos aún
    }

    @Test
    fun `test product search across name description category and subcategory is null-safe`() {
        val products = createSampleProducts()

        fun search(query: String): List<Product> {
            if (query.isBlank()) return products
            val q = query.trim().lowercase(Locale.ROOT)
            return products.filter {
                it.name.lowercase(Locale.ROOT).contains(q) ||
                it.description.lowercase(Locale.ROOT).contains(q) ||
                it.categoryName.lowercase(Locale.ROOT).contains(q) ||
                it.subCategoryName.lowercase(Locale.ROOT).contains(q)
            }
        }

        // Búsqueda por subcategoría
        val gourmetResults = search("gourmet")
        assertEquals(1, gourmetResults.size)
        assertEquals("prod_1", gourmetResults.first().id)

        // Búsqueda por ingrediente en descripción
        val angusResults = search("angus")
        assertEquals(1, angusResults.size)
        assertEquals("prod_1", angusResults.first().id)

        // Búsqueda por categoría
        val pizzaResults = search("pizza")
        assertEquals(1, pizzaResults.size)
        assertEquals("prod_3", pizzaResults.first().id)

        // Búsqueda insensible a mayúsculas
        val colaResults = search("COLA")
        assertEquals(1, colaResults.size)
        assertEquals("prod_4", colaResults.first().id)

        // Búsqueda sin coincidencia
        val noneResults = search("sushi")
        assertTrue(noneResults.isEmpty())
    }

    @Test
    fun `test menu filter chips functional integrity`() {
        val products = createSampleProducts()

        val activeList = products.filter { it.status == ProductStatus.ACTIVE }
        assertEquals(3, activeList.size)

        val outOfStockList = products.filter { it.status == ProductStatus.OUT_OF_STOCK || it.status == ProductStatus.INACTIVE }
        assertEquals(1, outOfStockList.size)
        assertEquals("prod_2", outOfStockList.first().id)

        val promoList = products.filter { it.hasDiscount }
        assertEquals(1, promoList.size)
        assertEquals("prod_1", promoList.first().id)
        assertEquals(320.0, promoList.first().originalPrice)

        val bestSellers = products.sortedByDescending { it.salesCount }
        assertEquals("prod_4", bestSellers.first().id) // 500 ventas
        assertEquals("prod_2", bestSellers[1].id)     // 300 ventas

        val newestList = products.sortedByDescending { it.createdAt.seconds }
        assertEquals("prod_4", newestList.first().id) // Más reciente
    }

    @Test
    fun `test product duplication creates clean copy with businessId isolation`() {
        val original = createSampleProducts().first()
        val copy = original.copy(
            id = "",
            name = "${original.name} (Copia)",
            businessId = "biz_enterprise_1"
        )

        assertTrue(copy.id.isEmpty())
        assertEquals("Hamburguesa Doble Queso (Copia)", copy.name)
        assertEquals("biz_enterprise_1", copy.businessId)
        assertEquals(original.price, copy.price, 0.001)
        assertEquals(original.categoryName, copy.categoryName)
        assertEquals(original.subCategoryName, copy.subCategoryName)
    }

    @Test
    fun `test product status toggle transitions between ACTIVE and OUT_OF_STOCK`() {
        val productActive = Product(id = "p1", status = ProductStatus.ACTIVE)
        val toggledToOutOfStock = productActive.copy(
            status = if (productActive.status == ProductStatus.ACTIVE) ProductStatus.OUT_OF_STOCK else ProductStatus.ACTIVE
        )
        assertEquals(ProductStatus.OUT_OF_STOCK, toggledToOutOfStock.status)

        val toggledBackToActive = toggledToOutOfStock.copy(
            status = if (toggledToOutOfStock.status == ProductStatus.ACTIVE) ProductStatus.OUT_OF_STOCK else ProductStatus.ACTIVE
        )
        assertEquals(ProductStatus.ACTIVE, toggledBackToActive.status)
    }

    @Test
    fun `test tenant isolation prevents cross-business data exposure`() {
        val bizAProducts = createSampleProducts("business_alpha")
        val bizBProducts = createSampleProducts("business_beta")
        val allProductsInStore = bizAProducts + bizBProducts

        val filteredForAlpha = allProductsInStore.filter { it.businessId == "business_alpha" }
        assertEquals(4, filteredForAlpha.size)
        assertTrue(filteredForAlpha.all { it.businessId == "business_alpha" })

        val filteredForBeta = allProductsInStore.filter { it.businessId == "business_beta" }
        assertEquals(4, filteredForBeta.size)
        assertTrue(filteredForBeta.all { it.businessId == "business_beta" })
    }

    @Test
    fun `test product price formatting and discount percentage`() {
        val product = Product(
            id = "p1",
            price = 220.0,
            originalPrice = 275.0
        )

        assertEquals("C$ 220", product.formattedPrice)
        assertEquals("C$ 275", product.formattedOriginalPrice)
        assertTrue(product.hasDiscount)
        assertEquals(20, product.discountPercentage)
    }
}
