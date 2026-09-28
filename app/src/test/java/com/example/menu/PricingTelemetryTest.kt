package com.example.menu

import com.example.domain.engine.menu.PricingTelemetry
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class PricingTelemetryTest {

    @Before
    fun setUp() {
        PricingTelemetry.reset()
    }

    @Test
    fun `test PricingTelemetry records snapshot calculations correctly`() {
        PricingTelemetry.recordCalculation(timeMs = 2, variantsCount = 8, optionsCount = 3)
        PricingTelemetry.recordCalculation(timeMs = 4, variantsCount = 4, optionsCount = 2)

        val snapshot = PricingTelemetry.getSnapshot()

        assertEquals(2L, snapshot.totalCalculations)
        assertEquals(6L, snapshot.totalExecutionTimeMs)
        assertEquals(3.0, snapshot.averageExecutionTimeMs, 0.001)
        assertEquals(12L, snapshot.totalVariantsEvaluated)
        assertEquals(5L, snapshot.totalOptionsProcessed)
    }
}
