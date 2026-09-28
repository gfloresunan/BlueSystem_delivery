package com.example.menu

import com.example.domain.model.menu.DiscountType
import com.example.domain.model.menu.MenuPromotion
import com.example.domain.model.menu.PromotionRule
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuPromotionTest {

    @Test
    fun `isValidAt returns true when active and within date range`() {
        val now = 1000L
        val promotion = MenuPromotion(
            id = "prom1",
            restaurantId = "rest1",
            name = "Summer Sale",
            discountType = DiscountType.PERCENTAGE,
            discountValue = 20.0,
            startDate = 500L,
            endDate = 1500L,
            isActive = true
        )

        assertTrue(promotion.isValidAt(now))
    }

    @Test
    fun `isValidAt returns false when inactive`() {
        val now = 1000L
        val promotion = MenuPromotion(
            id = "prom1",
            restaurantId = "rest1",
            name = "Summer Sale",
            discountType = DiscountType.PERCENTAGE,
            discountValue = 20.0,
            startDate = 500L,
            endDate = 1500L,
            isActive = false
        )

        assertFalse(promotion.isValidAt(now))
    }

    @Test
    fun `isValidAt returns false when outside date range`() {
        val now = 2000L
        val promotion = MenuPromotion(
            id = "prom1",
            restaurantId = "rest1",
            name = "Summer Sale",
            discountType = DiscountType.PERCENTAGE,
            discountValue = 20.0,
            startDate = 500L,
            endDate = 1500L,
            isActive = true
        )

        assertFalse(promotion.isValidAt(now))
    }
}
