package com.example.domain.model.menu

/**
 * Entidad de Dominio: ProductRecommendation
 * Sugerencia de venta cruzada (Cross-Selling) o complementos recomendados para un producto.
 */
data class ProductRecommendation(
    val id: String = "",
    val restaurantId: String = "",
    val sourceProductId: String = "",
    val recommendedProductId: String = "",
    val score: Double = 1.0,
    val reason: String = "POPULAR_PAIR"
)
