package com.example.domain.engine.kds

import com.example.domain.model.order.OrderPriority

/**
 * Servidor de Dominio: KitchenSLAEngine (Hito 14)
 * Detecta retrasos operacionales y pedidos VIP/Urgentes, reordenando automáticamente la cola
 * según prioridad: URGENT -> VIP -> HIGH -> NORMAL -> FIFO.
 */
class KitchenSLAEngine {

    private val timerEngine = KitchenTimerEngine()

    fun evaluateAndUpdatePriority(ticket: KdsTicket, currentTimeMillis: Long = System.currentTimeMillis()): KdsTicket {
        val timerMetrics = timerEngine.calculateTimerMetrics(ticket.order, currentTimeMillis)

        val newPriority = when {
            ticket.order.priority == OrderPriority.URGENT || ticket.order.priority == OrderPriority.VIP -> ticket.order.priority
            timerMetrics.delayMinutes > 15L -> OrderPriority.URGENT
            timerMetrics.delayMinutes > 5L -> OrderPriority.HIGH
            else -> ticket.order.priority
        }

        if (newPriority != ticket.order.priority) {
            val updatedOrder = ticket.order.copy(priority = newPriority)
            return ticket.copy(order = updatedOrder)
        }

        return ticket
    }

    fun sortQueueBySLA(tickets: List<KdsTicket>, currentTimeMillis: Long = System.currentTimeMillis()): List<KdsTicket> {
        val evaluated = tickets.map { evaluateAndUpdatePriority(it, currentTimeMillis) }

        val priorityRank = mapOf(
            OrderPriority.URGENT to 1,
            OrderPriority.VIP to 2,
            OrderPriority.HIGH to 3,
            OrderPriority.NORMAL to 4,
            OrderPriority.FIFO to 5
        )

        return evaluated.sortedWith(
            compareBy<KdsTicket> { priorityRank[it.order.priority] ?: 5 }
                .thenBy { it.enqueuedAt }
        )
    }
}
