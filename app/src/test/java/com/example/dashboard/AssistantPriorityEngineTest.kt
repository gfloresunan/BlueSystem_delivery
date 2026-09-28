package com.example.dashboard

import com.example.domain.engine.dashboard.AssistantPriorityEngine
import com.example.domain.engine.dashboard.InsightPriority
import org.junit.Assert.*
import org.junit.Test

class AssistantPriorityEngineTest {

    @Test
    fun testUrgentOverdueOrdersRankedFirst() {
        val insights = AssistantPriorityEngine.evaluateInsights(
            overdueOrdersCount = 2,
            outOfStockCount = 0,
            lowStockCount = 1,
            todaySales = 1200.0,
            ticketDropPercentage = 0.0
        )

        assertTrue(insights.isNotEmpty())
        assertEquals(InsightPriority.URGENT_CRITICAL, insights.first().priority)
        assertTrue(insights.first().title.contains("Atrasados"))
    }
}
