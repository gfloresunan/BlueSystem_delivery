package com.example.enterprise

import com.example.enterprise.health.HealthMonitorEngine
import com.example.enterprise.health.HealthStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class HealthMonitorEngineTest {

    private val healthMonitor = HealthMonitorEngine()

    @Test
    fun `test synthetic health check returns healthy status`() {
        val report = healthMonitor.runSyntheticHealthCheck(
            isFirestoreOnline = true,
            isPaymentGatewayOnline = true,
            isKdsHealthy = true
        )

        assertEquals(HealthStatus.HEALTHY, report.technicalHealth)
        assertEquals(HealthStatus.HEALTHY, report.businessHealth)
    }
}
