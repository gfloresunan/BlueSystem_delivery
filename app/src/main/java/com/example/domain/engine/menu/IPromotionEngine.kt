package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuPromotion

data class PromotionEvaluationContext(
    val restaurantId: String,
    val cartSubtotal: Double,
    val cartItemProductIds: List<String> = emptyList(),
    val cartItemCategoryIds: List<String> = emptyList(),
    val couponCode: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

data class PromotionEvaluationResult(
    val totalDiscountAmount: Double = 0.0,
    val appliedPromotions: List<MenuPromotion> = emptyList(),
    val isFreeShipping: Boolean = false,
    val appliedCouponCode: String? = null
)

interface IPromotionEngine {
    fun evaluatePromotions(
        activePromotions: List<MenuPromotion>,
        context: PromotionEvaluationContext
    ): PromotionEvaluationResult
}
