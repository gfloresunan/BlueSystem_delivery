package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class KpiCalculatorTest {

    @Test
    fun testAverageTicketCalculation() {
        val totalSales = 1500.0
        val orderCount = 3
        val avgTicket = totalSales / orderCount

        assertEquals(500.0, avgTicket, 0.001)
    }

    @Test
    fun testZeroOrdersAverageTicketIsZero() {
        val totalSales = 0.0
        val orderCount = 0
        val avgTicket = if (orderCount > 0) totalSales / orderCount else 0.0

        assertEquals(0.0, avgTicket, 0.001)
    }
}
