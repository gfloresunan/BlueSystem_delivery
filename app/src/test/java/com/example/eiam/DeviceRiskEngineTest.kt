package com.example.eiam

import com.example.eiam.domain.engine.DeviceRiskEngine
import com.example.eiam.domain.engine.TrustLevel
import com.example.eiam.domain.model.DeviceInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceRiskEngineTest {

    @Test
    fun testEvaluateDeviceRisk_cleanDevice() {
        val device = DeviceInfo(
            deviceId = "dev_100",
            isRooted = false,
            isEmulator = false,
            isDeveloperMode = false,
            playIntegrityPassed = true,
            lastKnownIp = "192.168.1.1"
        )

        val assessment = DeviceRiskEngine.evaluateDeviceRisk(device, "192.168.1.1")
        assertEquals(100, assessment.trustScore)
        assertEquals(TrustLevel.HIGH, assessment.trustLevel)
        assertTrue(!assessment.requiresMfaChallenge)
    }

    @Test
    fun testEvaluateDeviceRisk_rootedAndEmulatorDevice() {
        val device = DeviceInfo(
            deviceId = "dev_risk",
            isRooted = true,
            isEmulator = true,
            playIntegrityPassed = false
        )

        val assessment = DeviceRiskEngine.evaluateDeviceRisk(device)
        // 100 - 40 (Root) - 30 (Emulator) - 35 (Play Integrity) = 0
        assertEquals(0, assessment.trustScore)
        assertEquals(TrustLevel.LOW, assessment.trustLevel)
        assertTrue(assessment.requiresMfaChallenge)
    }
}
