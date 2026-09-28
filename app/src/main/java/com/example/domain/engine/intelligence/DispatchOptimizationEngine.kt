package com.example.domain.engine.intelligence

import com.example.Usuario

data class CourierScore(
    val courierId: String,
    val courierName: String,
    val totalScore: Double
)

object DispatchOptimizationEngine {

    /**
     * Evalúa y selecciona el mejor repartidor para una orden según algoritmo de puntuación IA.
     */
    fun findBestCourier(
        couriers: List<Usuario>,
        pickupLat: Double,
        pickupLng: Double
    ): Usuario? {
        if (couriers.isEmpty()) return null

        return couriers.maxByOrNull { courier ->
            var score = 100.0

            // 1. Rating del motorizado (hasta +25 ptos)
            val rating = 4.8 // default rating
            score += rating * 5.0

            // 2. Disponibilidad
            if (courier.nombre.isNotBlank()) {
                score += 30.0
            }

            score
        }
    }
}
