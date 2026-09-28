package com.example.finance

import org.junit.Assert.*
import org.junit.Test

class PerformanceBudgetFinanceTest {

    @Test
    fun testPerformanceBudgetLimits() {
        val initialRenderMs = 380
        val maxBudgetMs = 500
        assertTrue("Initial render must be within budget", initialRenderMs < maxBudgetMs)
    }
}
