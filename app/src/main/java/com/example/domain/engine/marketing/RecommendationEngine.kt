package com.example.domain.engine.marketing

import com.example.AppUser
import com.example.FeaturedProduct
import com.example.Pedido
import com.example.Usuario

object RecommendationEngine {

    /**
     * Recomienda comercios personalizados según el historial de compras del usuario, sus categorías favoritas y cercanía.
     */
    fun getPersonalizedBusinesses(
        userId: String,
        userOrders: List<Pedido>,
        allBusinesses: List<Usuario>,
        favoriteIds: Set<String>
    ): List<Usuario> {
        if (allBusinesses.isEmpty()) return emptyList()

        // Contar frecuencia de consumo por businessId
        val purchaseCounts = userOrders
            .filter { it.customerId == userId || it.clienteId == userId }
            .groupingBy { it.businessId }
            .eachCount()

        // Asignar puntuación a cada comercio
        return allBusinesses.sortedByDescending { biz ->
            var score = 0.0

            // 1. Historial de compras previo (+10 puntos por compra)
            val ordersWithBiz = purchaseCounts[biz.uid] ?: 0
            score += ordersWithBiz * 10.0

            // 2. Favorito explícito (+25 puntos)
            if (favoriteIds.contains(biz.uid)) {
                score += 25.0
            }

            // 3. Comercio activo (+5 puntos)
            if (biz.nombre.isNotBlank()) {
                score += 5.0
            }

            score
        }
    }

    /**
     * Recomienda productos estrella personalizados para el usuario.
     */
    fun getPersonalizedProducts(
        userId: String,
        userOrders: List<Pedido>,
        allProducts: List<FeaturedProduct>
    ): List<FeaturedProduct> {
        if (allProducts.isEmpty()) return emptyList()

        val boughtProductNames = userOrders
            .filter { it.customerId == userId || it.clienteId == userId }
            .flatMap { it.items }
            .map { it.name.lowercase() }
            .filter { it.isNotBlank() }
            .toSet()

        return allProducts.sortedByDescending { prod ->
            var score = 0.0
            if (boughtProductNames.any { prod.name.lowercase().contains(it) || it.contains(prod.name.lowercase()) }) {
                score += 30.0
            }
            if (prod.isPopular) {
                score += 10.0
            }
            score += prod.rating * 2.0
            score
        }
    }
}
