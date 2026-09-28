package com.example.domain.engine.intelligence

import java.util.Calendar

object DynamicPricingEngine {

    enum class WeatherCondition { CLEAR, RAIN, HEAVY_RAIN }

    /**
     * Calcula la tarifa de envío ajustada dinámicamente según distancia, clima y hora pico.
     */
    fun calculateDynamicDeliveryFee(
        baseFee: Double = 50.0,
        distanceKm: Double = 3.5,
        weather: WeatherCondition = WeatherCondition.CLEAR,
        activeOrdersInArea: Int = 12
    ): Double {
        var multiplier = 1.0

        // 1. Clima
        when (weather) {
            WeatherCondition.RAIN -> multiplier += 0.25 // +25% por lluvia
            WeatherCondition.HEAVY_RAIN -> multiplier += 0.50 // +50% por lluvia fuerte
            else -> {}
        }

        // 2. Hora Pico (12pm-2pm o 7pm-9pm)
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if (hour in 12..14 || hour in 19..21) {
            multiplier += 0.15 // +15% por hora pico
        }

        // 3. Alta Demanda (>20 pedidos activos)
        if (activeOrdersInArea > 20) {
            multiplier += 0.20
        }

        val distanceExtra = if (distanceKm > 3.0) (distanceKm - 3.0) * 10.0 else 0.0
        val finalFee = (baseFee + distanceExtra) * multiplier

        return kotlin.math.round(finalFee * 100.0) / 100.0
    }
}
