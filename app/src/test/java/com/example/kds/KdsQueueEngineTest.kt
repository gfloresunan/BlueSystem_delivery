package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class KdsQueueEngineTest {

    private val engine = KdsQueueEngine()

    @Test
    fun `test enqueue adds ticket to station queue`() {
        val order = Order(id = "o1", restaurantId = "rest1")
        val ticket = engine.enqueue(order, KitchenStation.GRILL)

        assertEquals("rest1", ticket.order.restaurantId)
        assertEquals(KitchenStation.GRILL, ticket.station)
        assertEquals(OperationalStatus.QUEUED, ticket.status)
    }

    @Test
    fun `test start transitions ticket to PREPARING`() {
        val order = Order(id = "o1", restaurantId = "rest1")
        val ticket = engine.enqueue(order)

        val startResult = engine.start(ticket.ticketId)

        assertTrue(startResult.isSuccess)
        val updated = startResult.getOrNull()
        assertEquals(OperationalStatus.PREPARING, updated?.status)
    }
}
