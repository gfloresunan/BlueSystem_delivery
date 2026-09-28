package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenSLAEngine
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderPriority
import org.junit.Assert.assertEquals
import org.junit.Test

class KitchenSLAEngineTest {

    private val queueEngine = KdsQueueEngine()
    private val slaEngine = KitchenSLAEngine()

    @Test
    fun `test sortQueueBySLA places delayed and URGENT orders first`() {
        val now = System.currentTimeMillis()

        val normalOrder = Order(id = "o_normal", createdAt = now, priority = OrderPriority.NORMAL)
        val delayedOrder = Order(id = "o_delayed", createdAt = now - (35 * 60 * 1000L), priority = OrderPriority.NORMAL)
        val vipOrder = Order(id = "o_vip", createdAt = now, priority = OrderPriority.VIP)

        val tktNormal = queueEngine.enqueue(normalOrder)
        val tktDelayed = queueEngine.enqueue(delayedOrder)
        val tktVip = queueEngine.enqueue(vipOrder)

        val sortedQueue = slaEngine.sortQueueBySLA(listOf(tktNormal, tktDelayed, tktVip), now)

        assertEquals(3, sortedQueue.size)
        assertEquals("o_delayed", sortedQueue[0].order.id) // URGENT por retraso > 15 mins
        assertEquals("o_vip", sortedQueue[1].order.id)     // VIP
        assertEquals("o_normal", sortedQueue[2].order.id)  // NORMAL
    }
}
