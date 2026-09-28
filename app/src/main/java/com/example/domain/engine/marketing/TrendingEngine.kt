package com.example.domain.engine.marketing

import com.example.FeaturedProduct
import com.example.Pedido
import com.example.Usuario

object TrendingEngine {

    /**
     * Calcula los comercios en tendencia "🔥 Cerca de ti" según frecuencia de pedidos en las últimas horas.
     */
    fun calculateTrendingBusinesses(
        allOrders: List<Pedido>,
        allBusinesses: List<Usuario>
    ): List<Usuario> {
        if (allBusinesses.isEmpty()) return emptyList()

        val recentBusinessOrderCounts = allOrders
            .groupingBy { it.businessId }
            .eachCount()

        return allBusinesses.sortedByDescending { biz ->
            val orderCount = recentBusinessOrderCounts[biz.uid] ?: 0
            orderCount.toDouble()
        }
    }

    /**
     * Determina si un comercio califica para "Destacado Automático" (>4.8 rating y alto volumen).
     */
    fun isAutoFeaturedEligible(
        rating: Double,
        completedOrdersCount: Int,
        deliverySuccessRatePct: Double = 98.0
    ): Boolean {
        return rating >= 4.8 && completedOrdersCount >= 50 && deliverySuccessRatePct >= 95.0
    }

    /**
     * Retorna los productos más vendidos de la semana (Top 20).
     */
    fun calculateTopSellingProducts(
        allOrders: List<Pedido>,
        allProducts: List<FeaturedProduct>
    ): List<FeaturedProduct> {
        val productOrderCounts = allOrders
            .flatMap { it.items }
            .groupingBy { it.productId.ifEmpty { it.name } }
            .eachCount()

        return allProducts.sortedByDescending { prod ->
            productOrderCounts[prod.id] ?: productOrderCounts[prod.name] ?: 0
        }.take(20)
    }
}
