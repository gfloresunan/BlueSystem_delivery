package com.example.controltower

import com.example.domain.engine.controltower.ControlTowerAlertEngine
import org.junit.Assert.*
import org.junit.Test

class AlertCenterTest {

    @Test
    fun testGenerateSystemAlerts() {
        val alerts = ControlTowerAlertEngine.generateSystemAlerts(overdueCount = 2, outOfStockCount = 1, pausedCouriersCount = 3)
        assertEquals(3, alerts.size)
        assertTrue(alerts.any { it.title.contains("SLA") })
    }
}
