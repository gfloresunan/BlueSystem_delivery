package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenSLAEngine
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderPriority
import org.junit.Assert.assertEquals
import org.junit.Test

class KdsPriorityE2ETest {

    private val queueEngine = KdsQueueEngine()
    private val slaEngine = KitchenSLAEngine()

    @Test
    fun `E2E 5 - KDS Priority Engine reorders VIP and Urgent orders to top of queue`() {
        val o1 = Order(id = "o1", priority = OrderPriority.NORMAL)
        val o2 = Order(id = "o2", priority = OrderPriority.VIP)
        val o3 = Order(id = "o3", priority = OrderPriority.URGENT)

        val t1 = queueEngine.enqueue(o1)
        val t2 = queueEngine.enqueue(o2)
        val t3 = queueEngine.enqueue(o3)

        val sorted = slaEngine.sortQueueBySLA(listOf(t1, t2, t3))

        assertEquals("o3", sorted[0].order.id) // URGENT
        assertEquals("o2", sorted[1].order.id) // VIP
        assertEquals("o1", sorted[2].order.id) // NORMAL
    }
}
