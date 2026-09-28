package com.example.enterprise

import com.example.enterprise.observability.GcpObservabilityProvider
import com.example.enterprise.observability.ObservabilityPlatform
import org.junit.Assert.assertEquals
import org.junit.Test

class ObservabilityStressTest {

    private val provider = GcpObservabilityProvider()
    private val platform = ObservabilityPlatform(provider)

    @Test
    fun `test stress throughput with 10,000 logs and metrics`() {
        for (i in 1..10_000) {
            platform.logInfo("STRESS", "Log entry $i")
            platform.recordMetric("stress_metric", i.toDouble())
        }

        assertEquals(10_000, provider.getLogsCount())
        assertEquals(10_000, provider.getMetricsCount())
    }
}
