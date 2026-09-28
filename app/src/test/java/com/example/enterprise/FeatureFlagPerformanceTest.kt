package com.example.enterprise

import com.example.enterprise.featureflags.FeatureFlag
import com.example.enterprise.featureflags.FeatureFlagEngine
import org.junit.Assert.assertTrue
import org.junit.Test

class FeatureFlagPerformanceTest {

    private val engine = FeatureFlagEngine()

    @Test
    fun `test 10,000 feature flag evaluations complete with sub-millisecond average latency`() {
        val flag = FeatureFlag(key = "perf_flag", isEnabled = true, rolloutPercentage = 100)
        engine.registerFlag(flag)

        val startTime = System.currentTimeMillis()
        for (i in 1..10_000) {
            engine.isFeatureEnabled("perf_flag", userId = "user_$i")
        }
        val durationMs = System.currentTimeMillis() - startTime
        val avgLatencyMs = durationMs.toDouble() / 10_000.0

        assertTrue("La latencia promedio por evaluación debe ser < 1ms (Actual: ${avgLatencyMs}ms)", avgLatencyMs < 1.0)
    }
}
