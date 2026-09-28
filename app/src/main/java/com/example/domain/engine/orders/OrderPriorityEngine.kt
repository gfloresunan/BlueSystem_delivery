package com.example.domain.engine.orders

import com.example.domain.model.orders.MerchantOrder
import com.example.domain.model.orders.OrderPriority
import com.example.domain.model.orders.SlaStatus

/**
 * Motor de Priorización Operativa (Order Priority Engine MOOC)
 * Ordena automáticamente los pedidos por: URGENT -> VIP -> SLA Risk -> FIFO.
 */
object OrderPriorityEngine {

    fun determinePriority(order: MerchantOrder): OrderPriority {
        return when {
            order.incidentsCount > 0 -> OrderPriority.URGENT
            order.isVipCustomer -> OrderPriority.VIP
            order.slaStatus == SlaStatus.CRITICAL || order.slaStatus == SlaStatus.BREACHED -> OrderPriority.SLA_RISK
            else -> OrderPriority.STANDARD
        }
    }

    fun sortOrdersByPriority(orders: List<MerchantOrder>): List<MerchantOrder> {
        return orders.sortedWith(
            compareBy<MerchantOrder> { it.priority.rank }
                .thenByDescending { it.elapsedMinutes }
        )
    }
}
