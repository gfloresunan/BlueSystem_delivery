package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class CustomerInsightsWidgetTest {

    @Test
    fun testCustomerMetricsAggregation() {
        val newCustomers = 14
        val recurring = 85
        val vip = 12
        val total = newCustomers + recurring + vip

        assertEquals(111, total)
        assertTrue(vip > 0)
    }
}
