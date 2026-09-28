package com.example.orders

import com.example.domain.model.orders.OrderTimelineStep
import org.junit.Assert.*
import org.junit.Test

class TimelineEngineTest {

    @Test
    fun testTimelineStepCompletion() {
        val step = OrderTimelineStep(stepName = "Pedido Recibido", timestampFormatted = "10:00 AM", isCompleted = true)
        assertTrue(step.isCompleted)
        assertEquals("Pedido Recibido", step.stepName)
    }
}
