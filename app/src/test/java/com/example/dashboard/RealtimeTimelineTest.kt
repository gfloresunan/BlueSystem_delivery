package com.example.dashboard

import com.example.domain.model.dashboard.ActivityType
import com.example.domain.model.dashboard.TimelineActivity
import org.junit.Assert.*
import org.junit.Test

class RealtimeTimelineTest {

    @Test
    fun testTimelineActivityItemCreation() {
        val item = TimelineActivity(
            id = "act_101",
            title = "Pedido #101",
            description = "Estado: DELIVERED",
            type = ActivityType.ORDER_DELIVERED
        )

        assertEquals("act_101", item.id)
        assertEquals(ActivityType.ORDER_DELIVERED, item.type)
    }
}
