package com.example.domain.model.menu

/**
 * Entidad de Dominio: MenuPromotion
 * Representa una regla promocional o cupón activo para un restaurante.
 */
data class MenuPromotion(
    val id: String = "",
    val restaurantId: String = "",
    val name: String = "",
    val description: String = "",
    val discountType: DiscountType = DiscountType.PERCENTAGE,
    val discountValue: Double = 0.0,
    val rule: PromotionRule = PromotionRule(),
    val startDate: Long = 0L,
    val endDate: Long = Long.MAX_VALUE,
    val isActive: Boolean = true,
    val priority: Int = 0
) {
    fun isValidAt(timestamp: Long): Boolean {
        return isActive && timestamp in startDate..endDate
    }
}
