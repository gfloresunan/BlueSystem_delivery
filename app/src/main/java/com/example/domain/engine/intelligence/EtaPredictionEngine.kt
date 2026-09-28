package com.example.domain.engine.intelligence

object EtaPredictionEngine {

    /**
     * Calcula el ETA (Tiempo Estimado de Entrega) dinámico e inteligente en minutos.
     */
    fun calculatePredictiveEtaMinutes(
        prepTimeMinutes: Int = 20,
        distanceKm: Double = 3.5,
        courierAvailable: Boolean = true,
        activeOrdersCount: Int = 5,
        isRaining: Boolean = false
    ): Int {
        var eta = prepTimeMinutes.toDouble()

        // Distancia: ~3 mins por km en ciudad
        eta += distanceKm * 3.5

        // Tráfico / Cola de pedidos
        if (activeOrdersCount > 10) {
            eta += 8.0
        }

        // Falta de motorizados inmediata
        if (!courierAvailable) {
            eta += 10.0
        }

        // Clima
        if (isRaining) {
            eta += 12.0
        }

        return eta.toInt().coerceAtLeast(15)
    }
}
