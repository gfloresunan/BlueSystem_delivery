package com.example.domain.repository.menu

import com.example.domain.model.menu.ProductRecommendation

interface IProductRecommendationRepository {
    suspend fun getRecommendationsForProduct(restaurantId: String, productId: String): List<ProductRecommendation>
    suspend fun saveRecommendation(recommendation: ProductRecommendation)
}
