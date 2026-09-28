package com.example.domain.event.order

/**
 * Eventos de Dominio de Pedidos y Operaciones de Cocina (Hito 14).
 */
sealed class OrderDomainEvent(
    val eventId: String = "evt_${System.currentTimeMillis()}_${(1000..9999).random()}",
    val timestamp: Long = System.currentTimeMillis(),
    open val orderId: String = ""
)

data class OrderCreatedEvent(override val orderId: String, val restaurantId: String) : OrderDomainEvent(orderId = orderId)
data class OrderValidatedEvent(override val orderId: String) : OrderDomainEvent(orderId = orderId)
data class PaymentStartedEvent(override val orderId: String, val amount: Double) : OrderDomainEvent(orderId = orderId)
data class PaymentConfirmedEvent(override val orderId: String, val transactionId: String) : OrderDomainEvent(orderId = orderId)
data class OrderConfirmedEvent(override val orderId: String) : OrderDomainEvent(orderId = orderId)
data class InventoryReservedEvent(override val orderId: String, val reservationCount: Int) : OrderDomainEvent(orderId = orderId)
data class InventoryReleasedEvent(override val orderId: String, val reason: String) : OrderDomainEvent(orderId = orderId)
data class InventoryConsumedEvent(override val orderId: String) : OrderDomainEvent(orderId = orderId)
data class TicketCreatedEvent(override val orderId: String, val ticketId: String) : OrderDomainEvent(orderId = orderId)
data class TicketAssignedEvent(override val orderId: String, val station: String) : OrderDomainEvent(orderId = orderId)
data class PreparationStartedEvent(override val orderId: String, val station: String) : OrderDomainEvent(orderId = orderId)
data class ItemReadyEvent(override val orderId: String, val itemId: String, val station: String) : OrderDomainEvent(orderId = orderId)
data class OrderReadyEvent(override val orderId: String) : OrderDomainEvent(orderId = orderId)
data class OrderPackedEvent(override val orderId: String) : OrderDomainEvent(orderId = orderId)
data class OrderDispatchedEvent(override val orderId: String, val driverId: String) : OrderDomainEvent(orderId = orderId)
data class OrderDeliveredEvent(override val orderId: String) : OrderDomainEvent(orderId = orderId)
data class OrderCancelledEvent(override val orderId: String, val reason: String) : OrderDomainEvent(orderId = orderId)
