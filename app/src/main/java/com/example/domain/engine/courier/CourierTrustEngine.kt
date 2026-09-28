package com.example.domain.engine.courier

import com.example.AuditLogger
import com.example.domain.model.AuditSeverity
import com.example.domain.security.SecurityEnforcementAction
import com.example.domain.security.TrustAssessment
import com.example.domain.security.TrustScoreCalculator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Motor central de seguridad y nivel de confianza del repartidor (CourierTrustEngine).
 */
class CourierTrustEngine {

    private val _assessment = MutableStateFlow(TrustAssessment())
    val assessment: StateFlow<TrustAssessment> = _assessment.asStateFlow()

    private var prevLat: Double? = null
    private var prevLng: Double? = null
    private var prevTimeMs: Long? = null
    private var anomalyCount = 0

    fun evaluatePing(
        courierId: String,
        isMockLocation: Boolean,
        isRooted: Boolean,
        currentLat: Double,
        currentLng: Double,
        currentTimeMs: Long = System.currentTimeMillis()
    ): TrustAssessment {

        val result = TrustScoreCalculator.evaluateTrust(
            courierId = courierId,
            isMockLocation = isMockLocation,
            isRooted = isRooted,
            prevLat = prevLat,
            prevLng = prevLng,
            prevTimeMs = prevTimeMs,
            currentLat = currentLat,
            currentLng = currentLng,
            currentTimeMs = currentTimeMs,
            anomalyCount = anomalyCount
        )

        if (result.detectedAnomalies.isNotEmpty()) {
            anomalyCount++
            AuditLogger.logEvent(
                event = "COURIER_TRUST_ANOMALY_DETECTED",
                details = mapOf(
                    "courierId" to courierId,
                    "trustScore" to result.trustScore,
                    "anomalies" to result.detectedAnomalies.joinToString("; "),
                    "action" to result.recommendedAction.name
                ),
                severity = if (result.recommendedAction == SecurityEnforcementAction.TEMPORARY_SUSPENSION) AuditSeverity.CRITICAL else AuditSeverity.SECURITY
            )
        }

        prevLat = currentLat
        prevLng = currentLng
        prevTimeMs = currentTimeMs

        _assessment.value = result
        return result
    }

    fun resetSession() {
        prevLat = null
        prevLng = null
        prevTimeMs = null
        anomalyCount = 0
        _assessment.value = TrustAssessment()
    }
}
