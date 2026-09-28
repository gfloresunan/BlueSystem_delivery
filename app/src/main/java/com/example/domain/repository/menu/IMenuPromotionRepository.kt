package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuPromotion

interface IMenuPromotionRepository {
    suspend fun getActivePromotions(restaurantId: String): List<MenuPromotion>
    suspend fun getPromotionByCouponCode(restaurantId: String, couponCode: String): MenuPromotion?
    suspend fun savePromotion(promotion: MenuPromotion)
    suspend fun deletePromotion(restaurantId: String, promotionId: String)
}
