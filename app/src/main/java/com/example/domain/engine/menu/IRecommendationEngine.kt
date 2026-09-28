package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.ProductRecommendation

interface IRecommendationEngine {
    fun getCrossSellingSuggestions(
        cartProductIds: List<String>,
        allRecommendations: List<ProductRecommendation>,
        catalogProducts: List<MenuProduct>,
        limit: Int = 5
    ): List<MenuProduct>
}
