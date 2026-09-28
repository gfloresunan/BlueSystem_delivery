package com.example.menu

import com.example.domain.engine.menu.PromotionEngineImpl
import com.example.domain.engine.menu.PromotionEvaluationContext
import com.example.domain.model.menu.DiscountType
import com.example.domain.model.menu.MenuPromotion
import com.example.domain.model.menu.PromotionRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PromotionEngineTest {

    private val engine = PromotionEngineImpl()

    @Test
    fun `evaluatePromotions applies percentage discount correctly`() {
        val promo = MenuPromotion(
            id = "p1",
            restaurantId = "r1",
            name = "10% OFF",
            discountType = DiscountType.PERCENTAGE,
            discountValue = 10.0,
            priority = 10
        )

        val context = PromotionEvaluationContext(
            restaurantId = "r1",
            cartSubtotal = 500.0
        )

        val result = engine.evaluatePromotions(listOf(promo), context)

        assertEquals(50.0, result.totalDiscountAmount, 0.001)
        assertEquals(1, result.appliedPromotions.size)
    }

    @Test
    fun `evaluatePromotions rejects promo if minOrderAmount not met`() {
        val promo = MenuPromotion(
            id = "p1",
            restaurantId = "r1",
            name = "100 OFF on 1000",
            discountType = DiscountType.FIXED_AMOUNT,
            discountValue = 100.0,
            rule = PromotionRule(minOrderAmount = 1000.0)
        )

        val context = PromotionEvaluationContext(
            restaurantId = "r1",
            cartSubtotal = 500.0
        )

        val result = engine.evaluatePromotions(listOf(promo), context)

        assertEquals(0.0, result.totalDiscountAmount, 0.001)
        assertTrue(result.appliedPromotions.isEmpty())
    }

    @Test
    fun `evaluatePromotions validates coupon code correctly`() {
        val promo = MenuPromotion(
            id = "p1",
            restaurantId = "r1",
            name = "CUPON20",
            discountType = DiscountType.FIXED_AMOUNT,
            discountValue = 20.0,
            rule = PromotionRule(couponCode = "PROMO20")
        )

        val contextInvalid = PromotionEvaluationContext(
            restaurantId = "r1",
            cartSubtotal = 200.0,
            couponCode = "WRONG"
        )
        val resultInvalid = engine.evaluatePromotions(listOf(promo), contextInvalid)
        assertEquals(0.0, resultInvalid.totalDiscountAmount, 0.001)

        val contextValid = PromotionEvaluationContext(
            restaurantId = "r1",
            cartSubtotal = 200.0,
            couponCode = "PROMO20"
        )
        val resultValid = engine.evaluatePromotions(listOf(promo), contextValid)
        assertEquals(20.0, resultValid.totalDiscountAmount, 0.001)
        assertEquals("PROMO20", resultValid.appliedCouponCode)
    }
}
