package com.example.menu

import com.example.data.adapter.menu.LegacyMenuAdapter
import com.example.domain.model.ProductStatus as LegacyProductStatus
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class LegacyMenuAdapterTest {

    @Test
    fun `test legacy menu adapter converts v2 product to legacy product seamlessly`() {
        val v2Product = MenuProduct(
            id = "p1",
            restaurantId = "rest_01",
            primaryCategoryId = "cat_01",
            name = "Hamburguesa Clásica",
            basePrice = 220.0,
            status = MenuProductStatus.ACTIVE,
            imageUrl = "https://storage.com/burger.jpg"
        )

        val legacyProduct = LegacyMenuAdapter.toLegacyProduct(v2Product, categoryName = "Hamburguesas")

        assertEquals("p1", legacyProduct.id)
        assertEquals("rest_01", legacyProduct.businessId)
        assertEquals("Hamburguesa Clásica", legacyProduct.name)
        assertEquals(220.0, legacyProduct.price, 0.001)
        assertEquals("Hamburguesas", legacyProduct.categoryName)
        assertEquals(LegacyProductStatus.ACTIVE, legacyProduct.status)
        assertEquals("C$ 220", legacyProduct.formattedPrice)
    }

    @Test
    fun `test legacy menu adapter converts legacy category to v2 category seamlessly`() {
        val legacyCat = com.example.domain.model.Category(
            id = "c1",
            name = "Pizzas",
            iconUrl = "https://storage.com/pizza.png",
            active = true,
            orderIndex = 1
        )

        val v2Cat = LegacyMenuAdapter.toV2Category(legacyCat, restaurantId = "rest_01")

        assertEquals("c1", v2Cat.id)
        assertEquals("rest_01", v2Cat.restaurantId)
        assertEquals("Pizzas", v2Cat.primaryName)
        assertEquals("https://storage.com/pizza.png", v2Cat.imageUrl)
        assertEquals(1, v2Cat.orderIndex)
    }
}
