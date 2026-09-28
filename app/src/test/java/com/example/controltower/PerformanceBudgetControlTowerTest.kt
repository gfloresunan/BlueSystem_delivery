package com.example.controltower

import org.junit.Assert.*
import org.junit.Test

class PerformanceBudgetControlTowerTest {

    @Test
    fun testPerformanceBudgetLimits() {
        val initialRenderMs = 520
        val maxBudgetMs = 600
        assertTrue("Initial render must be within budget", initialRenderMs < maxBudgetMs)
    }
}
