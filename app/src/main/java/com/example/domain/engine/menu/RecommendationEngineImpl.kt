package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.ProductRecommendation

class RecommendationEngineImpl : IRecommendationEngine {

    override fun getCrossSellingSuggestions(
        cartProductIds: List<String>,
        allRecommendations: List<ProductRecommendation>,
        catalogProducts: List<MenuProduct>,
        limit: Int
    ): List<MenuProduct> {
        if (cartProductIds.isEmpty()) return emptyList()

        val productMap = catalogProducts.associateBy { it.id }

        // 1. Encontrar todas las recomendaciones asociadas a los productos en el carrito
        val relevantRecommendations = allRecommendations
            .filter { it.sourceProductId in cartProductIds }
            .filter { it.recommendedProductId !in cartProductIds } // Excluir productos ya agregados al carrito
            .sortedByDescending { it.score }

        // 2. Mapear a entidades MenuProduct activas
        val suggestedProducts = mutableListOf<MenuProduct>()
        val addedProductIds = mutableSetOf<String>()

        for (rec in relevantRecommendations) {
            if (suggestedProducts.size >= limit) break

            val product = productMap[rec.recommendedProductId]
            if (product != null && product.status == MenuProductStatus.ACTIVE && product.id !in addedProductIds) {
                suggestedProducts.add(product)
                addedProductIds.add(product.id)
            }
        }

        return suggestedProducts
    }
}
