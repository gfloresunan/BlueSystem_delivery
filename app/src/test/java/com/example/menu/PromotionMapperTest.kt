package com.example.menu

import com.example.data.dto.menu.PromotionDto
import com.example.data.dto.menu.PromotionRuleDto
import com.example.data.mapper.menu.PromotionMapper
import com.example.domain.model.menu.DiscountType
import com.example.domain.model.menu.MenuPromotion
import com.example.domain.model.menu.PromotionRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PromotionMapperTest {

    @Test
    fun `toDomain maps PromotionDto correctly`() {
        val dto = PromotionDto(
            id = "prom123",
            restaurantId = "rest1",
            name = "20% OFF",
            description = "Desc 20%",
            discountType = "PERCENTAGE",
            discountValue = 20.0,
            rule = PromotionRuleDto(
                minOrderAmount = 100.0,
                applicableCategoryIds = listOf("cat1"),
                couponCode = "SAVE20"
            ),
            startDate = 100L,
            endDate = 500L,
            isActive = true,
            priority = 1
        )

        val domain = PromotionMapper.toDomain(dto)

        assertEquals("prom123", domain.id)
        assertEquals("rest1", domain.restaurantId)
        assertEquals(DiscountType.PERCENTAGE, domain.discountType)
        assertEquals(20.0, domain.discountValue, 0.001)
        assertEquals(100.0, domain.rule.minOrderAmount, 0.001)
        assertEquals(listOf("cat1"), domain.rule.applicableCategoryIds)
        assertEquals("SAVE20", domain.rule.couponCode)
        assertTrue(domain.isActive)
    }

    @Test
    fun `toDto maps MenuPromotion correctly`() {
        val domain = MenuPromotion(
            id = "prom123",
            restaurantId = "rest1",
            name = "2x1 Pizza",
            discountType = DiscountType.BUY_X_GET_Y,
            discountValue = 100.0,
            rule = PromotionRule(
                buyQuantity = 2,
                getQuantity = 1,
                applicableProductIds = listOf("prod1")
            ),
            isActive = true
        )

        val dto = PromotionMapper.toDto(domain)

        assertEquals("prom123", dto.id)
        assertEquals("BUY_X_GET_Y", dto.discountType)
        assertEquals(2, dto.rule.buyQuantity)
        assertEquals(1, dto.rule.getQuantity)
        assertEquals(listOf("prod1"), dto.rule.applicableProductIds)
    }
}
