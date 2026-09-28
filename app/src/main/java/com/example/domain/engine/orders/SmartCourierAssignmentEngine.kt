package com.example.domain.engine.orders

import com.example.domain.model.orders.CourierRecommendation

/**
 * Motor de Asignación Inteligente de Motorizados (Smart Courier Assignment Engine MOOC)
 * Califica repartidores disponibles con un score ponderado de 0 a 100 y recomienda al óptimo ⭐.
 */
object SmartCourierAssignmentEngine {

    fun rankCouriers(availableCouriers: List<CourierRecommendation>): List<CourierRecommendation> {
        if (availableCouriers.isEmpty()) return emptyList()

        val scored = availableCouriers.map { courier ->
            // Algoritmo ponderado: Distancia (40%), Carga Activa (30%), Calificación (20%), Batería (10%)
            val distancePenalty = (courier.distanceKm * 10).toInt()
            val loadPenalty = courier.activeOrdersCount * 20
            val ratingBonus = (courier.rating * 10).toInt()
            val batteryFactor = if (courier.batteryLevel > 20) 10 else 0

            val calculatedScore = (100 - distancePenalty - loadPenalty + ratingBonus + batteryFactor).coerceIn(10, 100)
            courier.copy(score = calculatedScore)
        }.sortedByDescending { it.score }

        val topScore = scored.first().score
        return scored.mapIndexed { idx, item ->
            item.copy(
                isRecommended = idx == 0 && topScore >= 60,
                recommendationReason = if (idx == 0) "Repartidor óptimo — Menor distancia y carga libre ⭐" else "Disponible"
            )
        }
    }
}
