package com.example.enterprise.communication

import com.example.enterprise.eventbus.EnterpriseEventBus

data class OrderDomainNotificationEvent(
    val eventType: String,
    val orderId: String,
    val customerId: String,
    val totalAmount: Double = 0.0,
    val driverName: String? = null
)

/**
 * Servidor Enterprise: NotificationDispatcher.
 * Escucha eventos del EnterpriseEventBus y los transforma en notificaciones multicanal desacopladas.
 */
class NotificationDispatcher(
    private val eventBus: EnterpriseEventBus,
    private val orchestrator: CommunicationOrchestrator,
    private val templateEngine: CommunicationTemplateEngine = CommunicationTemplateEngine()
) {

    fun initializeSubscriptions() {
        eventBus.subscribe(OrderDomainNotificationEvent::class.java) { evt ->
            processOrderEvent(evt)
        }
    }

    private suspend fun processOrderEvent(evt: OrderDomainNotificationEvent) {
        val vars = mapOf(
            "orderId" to evt.orderId,
            "total" to evt.totalAmount,
            "driverName" to (evt.driverName ?: "Motorizado")
        )

        val rendered = templateEngine.renderTemplate(evt.eventType, vars) ?: Pair("Notificación de Pedido", "Actualización sobre tu pedido ${evt.orderId}")

        val message = CommunicationMessage(
            recipientId = evt.customerId,
            title = rendered.first,
            body = rendered.second,
            channels = listOf(CommunicationChannel.IN_APP, CommunicationChannel.PUSH)
        )

        orchestrator.dispatchMessage(message)
    }
}
