package com.example.domain.model.orders

import com.example.Pedido

/**
 * Modelo de Pedido Enriquecido Enterprise para el MOOC (MerchantOrder)
 */
data class MerchantOrder(
    val rawPedido: Pedido,
    val orderId: String = rawPedido.pedidoId,
    val displayOrderCode: String = rawPedido.displayOrderCode,
    val customerName: String = rawPedido.customerName.ifBlank { "Cliente BlueSystem" },
    val customerPhone: String = rawPedido.customerPhone.ifBlank { "+505 8888-9999" },
    val deliveryAddress: String = rawPedido.destinationAddress.ifBlank { "Managua, Nicaragua" },
    val distanceKm: Double = 2.4,
    val etaMinutes: Int = 25,
    val totalAmount: Double = rawPedido.total, // Preservado para compatibilidad con consumidores existentes
    val customerTotal: Double = rawPedido.total, // Total pagado por el cliente
    val productSubtotal: Double = if (rawPedido.merchantGrossSales > 0.0) {
        rawPedido.merchantGrossSales
    } else if (rawPedido.subtotal > 0.0) {
        val discount = if (rawPedido.discountAmount > 0.0) rawPedido.discountAmount else 0.0
        maxOf(0.0, rawPedido.subtotal - discount)
    } else if (rawPedido.items.isNotEmpty()) {
        val itemsSum = rawPedido.items.sumOf { (it.price * it.quantity).toDouble() }
        if (itemsSum > 0.0) {
            val discount = if (rawPedido.discountAmount > 0.0) rawPedido.discountAmount else 0.0
            maxOf(0.0, itemsSum - discount)
        } else {
            0.0
        }
    } else {
        0.0
    },
    val paymentMethod: String = rawPedido.paymentMethod.ifBlank { "Efectivo" },
    val isPaid: Boolean = rawPedido.amountPaid > 0 || rawPedido.paymentMethod.isNotBlank(),
    val isVipCustomer: Boolean = false,
    val priority: OrderPriority = OrderPriority.STANDARD,
    val slaStatus: SlaStatus = SlaStatus.NORMAL,
    val elapsedMinutes: Int = 12,
    val expectedPreparationMinutes: Int = 15,
    val assignedCourierId: String? = rawPedido.motorizadoId.ifBlank { rawPedido.assignedCourierId },
    val assignedCourierName: String? = if (rawPedido.motorizadoId.isNotBlank() || rawPedido.assignedCourierId.isNotBlank()) "CarlosRepartidor" else null,
    val incidentsCount: Int = 0,
    val isRefunded: Boolean = false,
    val itemsSummary: String = if (rawPedido.items.isNotEmpty()) rawPedido.items.joinToString { "${it.quantity}x ${it.name}" } else "1x Pedido Comercial",
    val timelineSteps: List<OrderTimelineStep> = emptyList()
)
