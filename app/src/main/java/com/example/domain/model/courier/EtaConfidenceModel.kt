package com.example.domain.model.courier

/**
 * Estimación de ETA compuesta con Porcentaje de Confianza para el cliente y el sistema.
 */
data class EtaWithConfidence(
    val remainingTimeMinutes: Double = 0.0,
    val confidencePercentage: Double = 100.0, // 0.0% a 100.0%
    val isGpsSignalStable: Boolean = true,
    val speedVariance: Double = 0.0,
    val displayText: String = "${remainingTimeMinutes.toInt()} min (Confianza: ${confidencePercentage.toInt()}%)"
) {
    companion object {
        fun calculateConfidence(
            remainingTimeMinutes: Double,
            speedVariance: Double,
            isGpsStable: Boolean,
            deviationCount: Int
        ): EtaWithConfidence {
            var confidence = 98.0

            if (!isGpsStable) confidence -= 20.0
            if (speedVariance > 15.0) confidence -= 15.0 // Alta variabilidad de tráfico/velocidad
            confidence -= (deviationCount * 5.0)

            val finalConfidence = confidence.coerceIn(10.0, 99.0)
            return EtaWithConfidence(
                remainingTimeMinutes = remainingTimeMinutes,
                confidencePercentage = finalConfidence,
                isGpsSignalStable = isGpsStable,
                speedVariance = speedVariance
            )
        }
    }
}
