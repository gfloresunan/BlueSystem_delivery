package com.example.domain.model.controltower

import com.example.Pedido
import com.example.domain.model.orders.OrderPriority
import com.example.domain.model.orders.SlaStatus

/**
 * Modelo de Pedido para la Torre de Control (ControlTowerOrder)
 */
data class ControlTowerOrder(
    val rawPedido: Pedido,
    val orderId: String = rawPedido.pedidoId,
    val displayOrderCode: String = rawPedido.displayOrderCode,
    val customerName: String = rawPedido.customerName.ifBlank { "Cliente BlueSystem" },
    val customerAddress: String = rawPedido.destinationAddress.ifBlank { "Managua, Nicaragua" },
    val itemsSummary: String = if (rawPedido.items.isNotEmpty()) rawPedido.items.joinToString { "${it.quantity}x ${it.name}" } else "1x Combo Comercial",
    val totalAmount: Double = rawPedido.total,
    val status: String = rawPedido.status.ifBlank { "pending" },
    val slaStatus: SlaStatus = SlaStatus.NORMAL,
    val priority: OrderPriority = OrderPriority.STANDARD,
    val elapsedMinutes: Int = 14,
    val etaMinutes: Int = 22,
    val assignedCourierName: String? = if (rawPedido.motorizadoId.isNotBlank()) "Luis Repartidor" else null,
    val isVip: Boolean = rawPedido.total > 1500
)
