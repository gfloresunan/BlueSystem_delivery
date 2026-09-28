package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.model.order.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class ConcurrentOrderE2ETest {

    private val queueEngine = KdsQueueEngine()

    @Test
    fun `E2E 4 - Concurrent Orders queueing without race conditions`() = runBlocking {
        val jobs = (1..50).map { i ->
            async {
                val order = Order(id = "ord_conc_$i", restaurantId = "rest1")
                queueEngine.enqueue(order)
            }
        }

        val tickets = jobs.map { it.await() }

        assertEquals(50, tickets.size)
        val queue = queueEngine.getQueueByStation("rest1")
        assertEquals(50, queue.size)
    }
}
