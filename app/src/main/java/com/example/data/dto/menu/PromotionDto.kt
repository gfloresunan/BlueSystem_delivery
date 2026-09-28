package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class PromotionRuleDto(
    var minOrderAmount: Double = 0.0,
    var applicableCategoryIds: List<String> = emptyList(),
    var applicableProductIds: List<String> = emptyList(),
    var buyQuantity: Int = 1,
    var getQuantity: Int = 1,
    var couponCode: String? = null
)

@IgnoreExtraProperties
data class PromotionDto(
    var id: String = "",
    var restaurantId: String = "",
    var name: String = "",
    var description: String = "",
    var discountType: String = "PERCENTAGE",
    var discountValue: Double = 0.0,
    var rule: PromotionRuleDto = PromotionRuleDto(),
    var startDate: Long = 0L,
    var endDate: Long = Long.MAX_VALUE,
    var isActive: Boolean = true,
    var priority: Int = 0
)
