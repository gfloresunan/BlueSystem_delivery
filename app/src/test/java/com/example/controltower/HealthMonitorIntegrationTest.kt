package com.example.controltower

import com.example.domain.model.controltower.ControlTowerSystemHealth
import org.junit.Assert.*
import org.junit.Test

class HealthMonitorIntegrationTest {

    @Test
    fun testSystemHealthStatusValues() {
        val health = ControlTowerSystemHealth()
        assertTrue(health.firestoreStatus.contains("Operativo"))
        assertTrue(health.overallStatusLabel.contains("TIEMPO REAL"))
    }
}
