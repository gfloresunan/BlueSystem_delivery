package com.example.data.repository.menu

import com.example.data.dto.menu.PromotionDto
import com.example.data.mapper.menu.PromotionMapper
import com.example.domain.model.menu.MenuPromotion
import com.example.domain.repository.menu.IMenuPromotionRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class MenuPromotionRepositoryImpl(
    private val firestore: FirebaseFirestore
) : IMenuPromotionRepository {

    override suspend fun getActivePromotions(restaurantId: String): List<MenuPromotion> {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("promotions")
            .whereEqualTo("active", true)
            .get()
            .await()

        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(PromotionDto::class.java)?.let { dto ->
                dto.id = doc.id
                PromotionMapper.toDomain(dto)
            }
        }
    }

    override suspend fun getPromotionByCouponCode(restaurantId: String, couponCode: String): MenuPromotion? {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("promotions")
            .whereEqualTo("rule.couponCode", couponCode)
            .whereEqualTo("active", true)
            .limit(1)
            .get()
            .await()

        val doc = snapshot.documents.firstOrNull() ?: return null
        val dto = doc.toObject(PromotionDto::class.java) ?: return null
        dto.id = doc.id
        return PromotionMapper.toDomain(dto)
    }

    override suspend fun savePromotion(promotion: MenuPromotion) {
        val dto = PromotionMapper.toDto(promotion)
        firestore.collection("restaurants")
            .document(promotion.restaurantId)
            .collection("promotions")
            .document(promotion.id)
            .set(dto)
            .await()
    }

    override suspend fun deletePromotion(restaurantId: String, promotionId: String) {
        firestore.collection("restaurants")
            .document(restaurantId)
            .collection("promotions")
            .document(promotionId)
            .delete()
            .await()
    }
}
