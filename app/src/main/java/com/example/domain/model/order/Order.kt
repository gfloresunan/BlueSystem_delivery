package com.example.domain.model.order

import com.example.domain.engine.menu.PriceBreakdown

/**
 * Entidad Principal de Pedido Transaccional Enterprise v3.0 (Hito 14).
 * Separa estrictamente el estado comercial (financiero) y operativo (cocina).
 */
data class Order(
    val id: String = "",
    val restaurantId: String = "",
    val branchId: String = "",
    val customerId: String = "",
    val commercialStatus: CommercialStatus = CommercialStatus.CREATED,
    val operationalStatus: OperationalStatus = OperationalStatus.QUEUED,
    val priority: OrderPriority = OrderPriority.NORMAL,
    val source: String = "MOBILE_APP",
    val version: Long = 1L,
    val kitchenTicketId: String? = null,
    val dispatchId: String? = null,
    val paymentId: String? = null,
    val estimatedReadyTime: Long? = null,
    val actualReadyTime: Long? = null,
    val items: List<OrderItem> = emptyList(),
    val priceBreakdown: PriceBreakdown = PriceBreakdown(),
    val snapshotVersionId: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isOfflineCreated: Boolean = false
)
