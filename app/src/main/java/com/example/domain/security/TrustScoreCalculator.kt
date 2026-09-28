package com.example.domain.security

import com.example.GeoUtils

/**
 * Nivel de acción progresiva ante riesgos detectados por el CourierTrustEngine.
 */
enum class SecurityEnforcementAction {
    /** Evento 1: Registro silencioso en audit_logs para monitoreo */
    AUDIT_LOG_ONLY,

    /** Evento 2: Advertencia visual en UI para el repartidor */
    WARNING_ALERT,

    /** Evento 3: Bloqueo temporal del turno y derivación a la administración */
    TEMPORARY_SUSPENSION
}

/**
 * Reporte de evaluación de confianza del motorizado.
 */
data class TrustAssessment(
    val courierId: String = "",
    val trustScore: Int = 100, // 0 a 100
    val isMockLocationDetected: Boolean = false,
    val isRootedDevice: Boolean = false,
    val isImpossibleVelocityDetected: Boolean = false,
    val isClockManipulated: Boolean = false,
    val detectedAnomalies: List<String> = emptyList(),
    val recommendedAction: SecurityEnforcementAction = SecurityEnforcementAction.AUDIT_LOG_ONLY
)

/**
 * Calculador de confianza y detección de fraudes (TrustScoreCalculator).
 */
object TrustScoreCalculator {

    /** Max speed allowed in km/h before flagging impossible velocity anomaly */
    private const val MAX_SPEED_KMH = 120.0

    fun evaluateTrust(
        courierId: String,
        isMockLocation: Boolean,
        isRooted: Boolean,
        prevLat: Double?,
        prevLng: Double?,
        prevTimeMs: Long?,
        currentLat: Double,
        currentLng: Double,
        currentTimeMs: Long,
        clockTimeDeltaMs: Long = 0L,
        anomalyCount: Int = 0
    ): TrustAssessment {

        var score = 100
        val anomalies = mutableListOf<String>()

        if (isMockLocation) {
            score -= 40
            anomalies.add("Ubicación falsa / Mock GPS detectado")
        }

        if (isRooted) {
            score -= 15
            anomalies.add("Dispositivo con acceso Root / Magisk / EdXposed")
        }

        if (clockTimeDeltaMs > 10000L) { // Desviación >10s con reloj de red
            score -= 20
            anomalies.add("Manipulación del reloj del sistema detectada")
        }

        // Verificación de velocidad imposible
        var impossibleVelocity = false
        if (prevLat != null && prevLng != null && prevTimeMs != null) {
            val timeDiffMs = currentTimeMs - prevTimeMs
            if (timeDiffMs > 0) {
                val distKm = GeoUtils.calculateDistance(prevLat, prevLng, currentLat, currentLng)
                val timeHours = timeDiffMs.toDouble() / 3600000.0
                val speedKmh = distKm / timeHours
                if (speedKmh > MAX_SPEED_KMH) {
                    score -= 30
                    impossibleVelocity = true
                    anomalies.add("Velocidad imposible detectada: ${String.format("%.1f", speedKmh)} km/h")
                }
            }
        }

        val finalScore = score.coerceIn(0, 100)

        val action = when {
            anomalyCount >= 2 || finalScore < 40 -> SecurityEnforcementAction.TEMPORARY_SUSPENSION
            anomalyCount == 1 || finalScore < 70 -> SecurityEnforcementAction.WARNING_ALERT
            else -> SecurityEnforcementAction.AUDIT_LOG_ONLY
        }

        return TrustAssessment(
            courierId = courierId,
            trustScore = finalScore,
            isMockLocationDetected = isMockLocation,
            isRootedDevice = isRooted,
            isImpossibleVelocityDetected = impossibleVelocity,
            isClockManipulated = clockTimeDeltaMs > 10000L,
            detectedAnomalies = anomalies,
            recommendedAction = action
        )
    }
}
