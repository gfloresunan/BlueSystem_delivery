package com.example.menu

import com.example.domain.engine.menu.PricingEngineImpl
import com.example.domain.engine.menu.PromotionEngineImpl
import com.example.domain.engine.menu.PromotionEvaluationContext
import com.example.domain.engine.menu.RecommendationEngineImpl
import com.example.domain.model.menu.DiscountType
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuPromotion
import com.example.domain.model.menu.ProductRecommendation
import com.example.domain.model.menu.PromotionRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PromotionsAndRecommendationsE2ETest {

    private val pricingEngine = PricingEngineImpl()
    private val promotionEngine = PromotionEngineImpl()
    private val recommendationEngine = RecommendationEngineImpl()

    @Test
    fun `E2E Flow - Customer adds item, gets cross-selling recommendation, and applies promotional discount`() {
        // 1. Catálogo de productos
        val pizza = MenuProduct(id = "prod_pizza", name = "Pizza Familiar", basePrice = 300.0, status = MenuProductStatus.ACTIVE)
        val soda = MenuProduct(id = "prod_soda", name = "Soda 2L", basePrice = 50.0, status = MenuProductStatus.ACTIVE)
        val bread = MenuProduct(id = "prod_bread", name = "Pan con Ajo", basePrice = 40.0, status = MenuProductStatus.ACTIVE)

        val catalog = listOf(pizza, soda, bread)

        // 2. Recomendaciones de Cross-Selling en el sistema
        val recommendations = listOf(
            ProductRecommendation(id = "rec1", restaurantId = "rest1", sourceProductId = "prod_pizza", recommendedProductId = "prod_soda", score = 0.95),
            ProductRecommendation(id = "rec2", restaurantId = "rest1", sourceProductId = "prod_pizza", recommendedProductId = "prod_bread", score = 0.85)
        )

        // 3. Cliente agrega Pizza al carrito y pide sugerencias
        val cartItems = mutableListOf(pizza)
        val suggestions = recommendationEngine.getCrossSellingSuggestions(
            cartProductIds = cartItems.map { it.id },
            allRecommendations = recommendations,
            catalogProducts = catalog,
            limit = 5
        )

        assertEquals(2, suggestions.size)
        assertEquals("prod_soda", suggestions[0].id) // Soda es la más recomendada (score 0.95)

        // Cliente acepta la sugerencia y agrega Soda al carrito
        cartItems.add(soda)

        // 4. Calcular precio total de los items en carrito
        val pizzaBreakdown = pricingEngine.calculateItemPrice(pizza)
        val sodaBreakdown = pricingEngine.calculateItemPrice(soda)

        val rawSubtotal = pizzaBreakdown.totalPrice + sodaBreakdown.totalPrice
        assertEquals(402.5, rawSubtotal, 0.001) // (300 + 15% tax = 345) + (50 + 15% tax = 57.5) = 402.5

        // 5. Aplicar cupón de descuento "SUMMER15" (15% de descuento en el pedido)
        val promo15Percent = MenuPromotion(
            id = "promo_summer",
            restaurantId = "rest1",
            name = "Verano 15% OFF",
            discountType = DiscountType.PERCENTAGE,
            discountValue = 15.0,
            rule = PromotionRule(
                minOrderAmount = 200.0,
                couponCode = "SUMMER15"
            ),
            priority = 10
        )

        val promoContext = PromotionEvaluationContext(
            restaurantId = "rest1",
            cartSubtotal = rawSubtotal,
            cartItemProductIds = cartItems.map { it.id },
            couponCode = "SUMMER15"
        )

        val promoResult = promotionEngine.evaluatePromotions(listOf(promo15Percent), promoContext)

        // 6. Verificación de Integridad Financiera
        assertEquals(1, promoResult.appliedPromotions.size)
        assertEquals("SUMMER15", promoResult.appliedCouponCode)
        val expectedDiscount = rawSubtotal * 0.15 // 60.375
        assertEquals(expectedDiscount, promoResult.totalDiscountAmount, 0.001)

        val finalTotalPayable = rawSubtotal - promoResult.totalDiscountAmount
        assertEquals(342.125, finalTotalPayable, 0.001)
    }
}
