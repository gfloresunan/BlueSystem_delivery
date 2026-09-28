package com.example.enterprise.communication

import com.example.data.NotificationCenterManager
import com.example.enterprise.eventbus.EnterpriseEventBus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Sprint14_4E2ETest {

    private val eventBus = EnterpriseEventBus()
    private val orchestrator = CommunicationOrchestrator()
    private val dispatcher = NotificationDispatcher(eventBus, orchestrator)
    private val queueEngine = CommunicationQueueEngine()

    @Test
    fun `E2E Sprint 14_4 - Full Enterprise Communication Platform Validation`() = runBlocking {
        // 0. Limpieza previa del estado
        NotificationCenterManager.clear()

        // 1. Inicialización de suscripciones
        dispatcher.initializeSubscriptions()

        // 2. Evento de Dominio del Pedido publicado en el EventBus (Desacoplado)
        val event = OrderDomainNotificationEvent(
            eventType = "DISPATCH_ASSIGNED",
            orderId = "ord_e2e_99",
            customerId = "cust_e2e_1",
            driverName = "Carlos Repartidor"
        )
        eventBus.publish(event)

        // 3. Verificación de entrega en el NotificationCenter UI existente para el canal IN_APP
        val inAppNotifications = NotificationCenterManager.getUnreadNotifications("cust_e2e_1")
        assertEquals(1, inAppNotifications.size)
        assertEquals("Repartidor Asignado", inAppNotifications[0].title)
        assertTrue(inAppNotifications[0].body.contains("Carlos Repartidor"))

        // 4. Verificación de Idempotencia y Deduplicación en la Cola
        val msg = CommunicationMessage(messageId = "msg_dup_1", recipientId = "u1", title = "T", body = "B")
        assertTrue(queueEngine.enqueue(msg))
        assertTrue(!queueEngine.enqueue(msg)) // Rechazado por duplicado
    }
}
