package com.example.menu

import com.example.domain.engine.menu.RecommendationEngineImpl
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.ProductRecommendation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RecommendationEngineTest {

    private val engine = RecommendationEngineImpl()

    @Test
    fun `getCrossSellingSuggestions returns top scoring recommendations excluding items already in cart`() {
        val prodBurger = MenuProduct(id = "p_burger", name = "Burger", basePrice = 150.0)
        val prodFries = MenuProduct(id = "p_fries", name = "Fries", basePrice = 50.0, status = MenuProductStatus.ACTIVE)
        val prodSoda = MenuProduct(id = "p_soda", name = "Soda", basePrice = 30.0, status = MenuProductStatus.ACTIVE)
        val prodDessert = MenuProduct(id = "p_dessert", name = "Ice Cream", basePrice = 60.0, status = MenuProductStatus.ARCHIVED)

        val recommendations = listOf(
            ProductRecommendation(id = "r1", restaurantId = "r1", sourceProductId = "p_burger", recommendedProductId = "p_fries", score = 0.9),
            ProductRecommendation(id = "r2", restaurantId = "r1", sourceProductId = "p_burger", recommendedProductId = "p_soda", score = 0.95),
            ProductRecommendation(id = "r3", restaurantId = "r1", sourceProductId = "p_burger", recommendedProductId = "p_dessert", score = 0.8)
        )

        val catalog = listOf(prodBurger, prodFries, prodSoda, prodDessert)

        // Caso 1: Solo hamburguesa en carrito -> Debe sugerir Soda (0.95) primero y luego Fries (0.9), excluyendo el archivado
        val suggestions = engine.getCrossSellingSuggestions(
            cartProductIds = listOf("p_burger"),
            allRecommendations = recommendations,
            catalogProducts = catalog,
            limit = 5
        )

        assertEquals(2, suggestions.size)
        assertEquals("p_soda", suggestions[0].id)
        assertEquals("p_fries", suggestions[1].id)

        // Caso 2: Hamburguesa y Soda en carrito -> Debe sugerir solo Fries
        val suggestionsWithSodaInCart = engine.getCrossSellingSuggestions(
            cartProductIds = listOf("p_burger", "p_soda"),
            allRecommendations = recommendations,
            catalogProducts = catalog,
            limit = 5
        )

        assertEquals(1, suggestionsWithSodaInCart.size)
        assertEquals("p_fries", suggestionsWithSodaInCart[0].id)
    }
}
