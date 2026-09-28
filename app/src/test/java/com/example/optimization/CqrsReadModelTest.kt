package com.example.optimization

import com.example.domain.model.cqrs.DashboardSummary
import com.example.domain.model.cqrs.KdsSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class CqrsReadModelTest {

    @Test
    fun `test DashboardSummary aggregated document creation`() {
        val summary = DashboardSummary(
            restaurantId = "r1",
            todaySales = 12500.0,
            todayOrdersCount = 45,
            pendingOrdersCount = 3
        )

        assertEquals("r1", summary.restaurantId)
        assertEquals(12500.0, summary.todaySales, 0.001)
        assertEquals(45, summary.todayOrdersCount)
    }

    @Test
    fun `test KdsSummary active queue aggregated document`() {
        val kdsSummary = KdsSummary(
            restaurantId = "r1",
            activeTicketsCount = 8,
            queuedTicketsCount = 5,
            preparingTicketsCount = 3
        )

        assertEquals(8, kdsSummary.activeTicketsCount)
        assertEquals(5, kdsSummary.queuedTicketsCount)
    }
}
