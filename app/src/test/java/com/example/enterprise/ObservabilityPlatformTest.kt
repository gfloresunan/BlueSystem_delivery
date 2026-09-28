package com.example.enterprise

import com.example.enterprise.observability.GcpObservabilityProvider
import com.example.enterprise.observability.ObservabilityPlatform
import com.example.enterprise.observability.TraceContext
import org.junit.Assert.assertEquals
import org.junit.Test

class ObservabilityPlatformTest {

    private val provider = GcpObservabilityProvider()
    private val platform = ObservabilityPlatform(provider)

    @Test
    fun `test observability logs with TraceContext`() {
        val trace = TraceContext()
        platform.logInfo("ORDER", "Order created successfully", trace)
        platform.recordMetric("order_count", 1.0)

        assertEquals(1, provider.getLogsCount())
        assertEquals(1, provider.getMetricsCount())
    }
}
