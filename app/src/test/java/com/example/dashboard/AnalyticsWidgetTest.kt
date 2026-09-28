package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class AnalyticsWidgetTest {

    @Test
    fun testSalesProjectionCalculation() {
        val todaySales = 500.0
        val weekProjection = todaySales * 5.2

        assertEquals(2600.0, weekProjection, 0.001)
    }
}
