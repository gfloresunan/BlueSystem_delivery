package com.example.eiam.domain.engine

import com.example.eiam.domain.model.DeviceInfo

/**
 * EIAM — DeviceRiskEngine (EIAM v2.1)
 * Evalúa el nivel de riesgo de un dispositivo Android basándose en señales de hardware y ambiente.
 */
object DeviceRiskEngine {

    /**
     * Calcula la puntuación de confianza (0–100) y actualiza las métricas de riesgo del dispositivo.
     */
    fun evaluateDeviceRisk(
        device: DeviceInfo,
        knownIp: String? = null
    ): DeviceRiskAssessment {
        var score = 100
        val riskFlags = mutableListOf<String>()

        if (device.isRooted) {
            score -= 40
            riskFlags.add("DEVICE_ROOTED")
        }

        if (device.isEmulator) {
            score -= 30
            riskFlags.add("EMULATOR_DETECTED")
        }

        if (device.isDeveloperMode) {
            score -= 10
            riskFlags.add("DEVELOPER_MODE_ACTIVE")
        }

        if (!device.playIntegrityPassed) {
            score -= 35
            riskFlags.add("PLAY_INTEGRITY_FAILED")
        }

        if (knownIp != null && device.lastKnownIp.isNotBlank() && device.lastKnownIp != knownIp) {
            score -= 15
            riskFlags.add("IP_LOCATION_CHANGED")
        }

        val finalScore = score.coerceIn(0, 100)
        val trustLevel = when {
            finalScore >= 80 -> TrustLevel.HIGH
            finalScore >= 50 -> TrustLevel.MEDIUM
            else -> TrustLevel.LOW
        }

        val updatedDevice = device.copy(
            trustLevel = finalScore,
            lastKnownIp = knownIp ?: device.lastKnownIp
        )

        return DeviceRiskAssessment(
            evaluatedDevice = updatedDevice,
            trustScore = finalScore,
            trustLevel = trustLevel,
            riskFlags = riskFlags,
            requiresMfaChallenge = finalScore < 50
        )
    }
}

enum class TrustLevel { HIGH, MEDIUM, LOW }

data class DeviceRiskAssessment(
    val evaluatedDevice: DeviceInfo,
    val trustScore: Int,
    val trustLevel: TrustLevel,
    val riskFlags: List<String>,
    val requiresMfaChallenge: Boolean
)
