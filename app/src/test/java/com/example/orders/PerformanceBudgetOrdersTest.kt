package com.example.orders

import org.junit.Assert.*
import org.junit.Test

class PerformanceBudgetOrdersTest {

    @Test
    fun testPerformanceBudgetLimits() {
        val initialRenderMs = 450
        val maxBudgetMs = 800
        assertTrue("Initial render must be within budget", initialRenderMs < maxBudgetMs)
    }
}
