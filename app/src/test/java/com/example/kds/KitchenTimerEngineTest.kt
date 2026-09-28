package com.example.kds

import com.example.domain.engine.kds.KitchenTimerEngine
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KitchenTimerEngineTest {

    private val engine = KitchenTimerEngine()

    @Test
    fun `test timer metrics calculates expected time and elapsed correctly`() {
        val now = System.currentTimeMillis()
        val order = Order(
            id = "o1",
            createdAt = now - (10 * 60 * 1000L), // Creado hace 10 minutos
            items = listOf(OrderItem(id = "i1"), OrderItem(id = "i2")) // 2 ítems -> 15 + 4 = 19 min esperados
        )

        val metrics = engine.calculateTimerMetrics(order, now)

        assertEquals(19, metrics.expectedPrepTimeMinutes)
        assertEquals(10L, metrics.elapsedTimeMinutes)
        assertFalse(metrics.isDelayed)
        assertEquals(0L, metrics.delayMinutes)
    }

    @Test
    fun `test timer metrics detects delayed order`() {
        val now = System.currentTimeMillis()
        val order = Order(
            id = "o1",
            createdAt = now - (30 * 60 * 1000L), // Creado hace 30 minutos
            items = listOf(OrderItem(id = "i1")) // 15 + 2 = 17 min esperados
        )

        val metrics = engine.calculateTimerMetrics(order, now)

        assertTrue(metrics.isDelayed)
        assertEquals(13L, metrics.delayMinutes) // 30 - 17 = 13 mins atrasado
    }
}
