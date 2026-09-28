package com.example.optimization

import com.example.domain.engine.telemetry.FirestoreCostTracker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirestoreCostTrackerTest {

    private val costTracker = FirestoreCostTracker(monthlyBudgetThresholdUsd = 10.0)

    @Test
    fun `test trackOperation accumulates reads and estimates cost in USD`() {
        val metrics = costTracker.trackOperation("rest1", reads = 100_000, writes = 100_000)

        assertEquals(100_000L, metrics.readsCount)
        assertEquals(100_000L, metrics.writesCount)
        // (100K/100K)*0.06 + (100K/100K)*0.18 = 0.24 USD
        assertEquals(0.24, metrics.estimatedMonthlyCostUsd, 0.001)
        assertFalse(metrics.isBudgetExceeded)
    }

    @Test
    fun `test budget threshold alert when cost exceeds limit`() {
        // 20 millones de escrituras -> 200 * 0.18 = 36 USD > 10.0 USD
        val metrics = costTracker.trackOperation("rest_big", writes = 20_000_000)

        assertTrue(metrics.isBudgetExceeded)
    }
}
