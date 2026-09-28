package com.example.enterprise.communication

import com.example.enterprise.eventbus.EnterpriseEventBus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class CommunicationDispatcherTest {

    private val eventBus = EnterpriseEventBus()
    private val orchestrator = CommunicationOrchestrator()
    private val dispatcher = NotificationDispatcher(eventBus, orchestrator)

    @Test
    fun `test NotificationDispatcher processes OrderDomainNotificationEvent from EventBus`() = runBlocking {
        dispatcher.initializeSubscriptions()

        val event = OrderDomainNotificationEvent(
            eventType = "ORDER_CONFIRMED",
            orderId = "o_100",
            customerId = "cust_55",
            totalAmount = 250.0
        )

        eventBus.publish(event)

        // Verificación de cola / notificación entregada
        val pendingCount = CommunicationQueueEngine().getPendingCount()
        assertEquals(0, pendingCount)
    }
}
