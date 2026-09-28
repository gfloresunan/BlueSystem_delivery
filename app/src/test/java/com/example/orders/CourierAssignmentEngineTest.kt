package com.example.orders

import com.example.domain.engine.orders.SmartCourierAssignmentEngine
import com.example.domain.model.orders.CourierRecommendation
import org.junit.Assert.*
import org.junit.Test

class CourierAssignmentEngineTest {

    @Test
    fun testRankCouriersSelection() {
        val list = listOf(
            CourierRecommendation("c1", "Luis", distanceKm = 4.5, activeOrdersCount = 2),
            CourierRecommendation("c2", "Carlos", distanceKm = 0.8, activeOrdersCount = 0)
        )

        val ranked = SmartCourierAssignmentEngine.rankCouriers(list)
        assertEquals(2, ranked.size)
        assertEquals("c2", ranked.first().courierId)
        assertTrue(ranked.first().isRecommended)
    }
}
