package com.example.domain.model.menu

/**
 * Reglas de elegibilidad y condiciones para aplicar una promoción.
 */
data class PromotionRule(
    val minOrderAmount: Double = 0.0,
    val applicableCategoryIds: List<String> = emptyList(),
    val applicableProductIds: List<String> = emptyList(),
    val buyQuantity: Int = 1,
    val getQuantity: Int = 1,
    val couponCode: String? = null
)
