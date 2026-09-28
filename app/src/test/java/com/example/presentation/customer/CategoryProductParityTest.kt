package com.example.presentation.customer

import com.example.data.repository.BusinessInfo
import com.example.domain.engine.intelligence.CustomerSearchResult
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Test de Paridad Visual y de Contrato de Datos para Tarjetas de Productos:
 * Búsqueda Global vs. Selección por Categoría (BSD-CUSTOMER-CATALOG-FORENSIC-REPAIR-002)
 */
class CategoryProductParityTest {

    private fun mapProductToSearchResult(
        product: Product,
        biz: BusinessInfo?
    ): CustomerSearchResult {
        val bizName = biz?.getEffectiveName() ?: "Comercio"
        val isCombo = product.category == ProductCategory.COMBO
        val effectiveType = if (isCombo) CustomerSearchResultType.COMBO else CustomerSearchResultType.PRODUCT
        val discount = if (product.hasDiscount) "-${product.discountPercentage}%" else null
        val categoryName = product.categoryName.ifBlank { product.category.name.replace("_", " ") }

        val bizCatNorm = biz?.getEffectiveCategory()?.trim()?.lowercase() ?: ""
        val isRestaurant = bizCatNorm.contains("restaurante") || bizCatNorm.contains("comida") || 
                           bizCatNorm.contains("gastronom") || bizCatNorm.contains("fritanga") || 
                           bizCatNorm.contains("cafeteria") || bizCatNorm.contains("bar")

        val badgeLabel = if (isRestaurant) "PLATO" else categoryName.trim().uppercase().ifBlank { "PRODUCTO" }
        val badgeEmoji = if (isRestaurant) "🍔" else "🍽️"

        return CustomerSearchResult(
            id = product.id,
            type = effectiveType,
            title = product.name,
            subtitle = bizName,
            description = product.description.ifBlank { product.shortDescription },
            imageUrl = product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl },
            price = product.price,
            originalPrice = product.originalPrice,
            discountTag = discount,
            businessId = product.businessId,
            businessName = bizName,
            branchId = product.branchId,
            categoryName = categoryName,
            rating = product.rating,
            isAvailable = product.status == ProductStatus.ACTIVE,
            relevanceScore = 100,
            rawItem = product,
            badgeLabel = badgeLabel,
            badgeEmoji = badgeEmoji
        )
    }

    @Test
    fun `test product mapping preserves business name and formatted price for Fritanga products`() {
        val fritoni = BusinessInfo(
            id = "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
            name = "FRITONI",
            category = "Restaurante",
            isActive = true
        )

        val fritoTacos = Product(
            id = "prod_fritotacos_001",
            name = "FritoTacos",
            description = "Crujientes tacos dorados acompañados de ensalada de repollo y salsa especial.",
            price = 120.0,
            originalPrice = 150.0,
            businessId = fritoni.id,
            category = ProductCategory.MAIN_COURSE,
            categoryName = "Fritanga NICA",
            imageUrl = "https://example.com/fritotacos.jpg",
            status = ProductStatus.ACTIVE
        )

        val cardModel = mapProductToSearchResult(fritoTacos, fritoni)

        assertEquals("FritoTacos", cardModel.title)
        assertEquals("FRITONI", cardModel.subtitle)
        assertEquals("C$ 120", cardModel.formattedPrice)
        assertEquals("C$ 150", cardModel.formattedOriginalPrice)
        assertEquals("-20%", cardModel.discountTag)
        assertEquals("PLATO", cardModel.badgeLabel)
        assertEquals("🍔", cardModel.badgeEmoji)
        assertEquals("dlRY2ZVUqPR2Fxoc3cazcOxxRJg2", cardModel.businessId)
        assertTrue(cardModel.isAvailable)
    }

    @Test
    fun `test products without discount display clean price without original strikethrough`() {
        val elChanchito = BusinessInfo(
            id = "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
            name = "El Chanchito",
            category = "Restaurante",
            isActive = true
        )

        val macanazo = Product(
            id = "prod_macanazo_002",
            name = "Macanazo",
            description = "Carne de cerdo frita con yuca caliente y chicharrón crujiente.",
            price = 220.0,
            businessId = elChanchito.id,
            category = ProductCategory.MAIN_COURSE,
            categoryName = "Fritanga NICA",
            status = ProductStatus.ACTIVE
        )

        val cardModel = mapProductToSearchResult(macanazo, elChanchito)

        assertEquals("Macanazo", cardModel.title)
        assertEquals("El Chanchito", cardModel.subtitle)
        assertEquals("C$ 220", cardModel.formattedPrice)
        assertEquals(null, cardModel.formattedOriginalPrice)
        assertEquals(null, cardModel.discountTag)
        assertEquals("PLATO", cardModel.badgeLabel)
    }

    @Test
    fun `test non-restaurant product preserves specific category badge`() {
        val tecnostore = BusinessInfo(
            id = "biz_canonical_tecnostore",
            name = "TECNOSTORE",
            category = "Tecnología",
            isActive = true
        )

        val laptop = Product(
            id = "prod_laptop_003",
            name = "Laptop Dell Latitude",
            description = "Intel Core i7 16GB RAM SSD 512GB",
            price = 18500.0,
            businessId = tecnostore.id,
            category = ProductCategory.GENERAL,
            categoryName = "Laptops",
            status = ProductStatus.ACTIVE
        )

        val cardModel = mapProductToSearchResult(laptop, tecnostore)

        assertEquals("Laptop Dell Latitude", cardModel.title)
        assertEquals("TECNOSTORE", cardModel.subtitle)
        assertEquals("LAPTOPS", cardModel.badgeLabel)
        assertEquals("C$ 18500", cardModel.formattedPrice)
    }
}
