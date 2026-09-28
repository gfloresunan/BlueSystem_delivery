package com.example.domain.engine.controltower

import com.example.domain.model.controltower.FleetCourier

/**
 * Motor de Asignación Inteligente de Flota DCT (ControlTowerSmartAssignmentEngine)
 */
object ControlTowerSmartAssignmentEngine {

    fun suggestBestCourier(availableCouriers: List<FleetCourier>): FleetCourier? {
        if (availableCouriers.isEmpty()) return null
        return availableCouriers.maxByOrNull { c ->
            val distScore = (10.0 - c.distanceKm).coerceAtLeast(0.0) * 10.0
            val ratingScore = c.rating * 10.0
            val batteryFactor = if (c.batteryLevel > 20) 10.0 else 0.0

            distScore + ratingScore + batteryFactor
        }
    }
}
