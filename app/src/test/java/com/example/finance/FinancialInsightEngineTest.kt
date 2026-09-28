package com.example.finance

import com.example.domain.engine.finance.FinancialInsightEngine
import com.example.domain.model.finance.FinancialSummary
import org.junit.Assert.*
import org.junit.Test

class FinancialInsightEngineTest {

    @Test
    fun testGenerateInsightsFromSummary() {
        val summary = FinancialSummary(grossSales = 15000.0, averageTicketAmount = 350.0)
        val insights = FinancialInsightEngine.generateInsights(summary)
        assertTrue(insights.isNotEmpty())
        assertTrue(insights.any { it.title.contains("Ventas") })
    }
}
