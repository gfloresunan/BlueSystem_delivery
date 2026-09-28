package com.example.data.repository.menu

import com.example.data.dto.menu.RecommendationDto
import com.example.data.mapper.menu.RecommendationMapper
import com.example.domain.model.menu.ProductRecommendation
import com.example.domain.repository.menu.IProductRecommendationRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class ProductRecommendationRepositoryImpl(
    private val firestore: FirebaseFirestore
) : IProductRecommendationRepository {

    override suspend fun getRecommendationsForProduct(restaurantId: String, productId: String): List<ProductRecommendation> {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("recommendations")
            .whereEqualTo("sourceProductId", productId)
            .get()
            .await()

        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(RecommendationDto::class.java)?.let { dto ->
                dto.id = doc.id
                RecommendationMapper.toDomain(dto)
            }
        }
    }

    override suspend fun saveRecommendation(recommendation: ProductRecommendation) {
        val dto = RecommendationMapper.toDto(recommendation)
        firestore.collection("restaurants")
            .document(recommendation.restaurantId)
            .collection("recommendations")
            .document(recommendation.id)
            .set(dto)
            .await()
    }
}
