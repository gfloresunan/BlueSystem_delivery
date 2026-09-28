package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenTelemetryEngine
import com.example.domain.model.order.Order
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TelemetryEngineTest {

    private val telemetry = KitchenTelemetryEngine()
    private val queueEngine = KdsQueueEngine()

    @Test
    fun `test telemetry records completed ticket metrics`() {
        val now = System.currentTimeMillis()
        val order = Order(id = "o1")
        val ticket = queueEngine.enqueue(order)

        val started = queueEngine.start(ticket.ticketId).getOrThrow()
        val ready = queueEngine.ready(started.ticketId).getOrThrow()

        telemetry.recordCompletedTicket(ready)

        val metrics = telemetry.calculateSummaryMetrics(emptyList())

        assertEquals(1, metrics.totalTicketsProcessed)
        assertTrue(metrics.averageTicketTimeMs >= 0L)
        assertEquals(100.0, metrics.slaCompliancePercentage, 0.01)
    }
}
