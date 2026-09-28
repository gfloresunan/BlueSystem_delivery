package com.example.domain.engine.kds

import com.example.domain.model.order.Order
import com.example.domain.model.order.OperationalStatus

data class KdsTicket(
    val ticketId: String = "",
    val order: Order,
    val station: KitchenStation = KitchenStation.ASSEMBLY,
    val status: OperationalStatus = OperationalStatus.QUEUED,
    val assignedCookId: String? = null,
    val enqueuedAt: Long = System.currentTimeMillis(),
    val startedAt: Long? = null,
    val completedAt: Long? = null,
    val isPaused: Boolean = false
)

/**
 * Servidor de Dominio: KdsQueueEngine (Hito 14)
 * Administra las colas de tickets en pantalla KDS con soporte para acciones operacionales:
 * enqueue, assign, start, pause, resume, ready, bump y cancel.
 */
class KdsQueueEngine {

    private val ticketsMemory = mutableListOf<KdsTicket>()

    fun enqueue(order: Order, station: KitchenStation = KitchenStation.ASSEMBLY): KdsTicket {
        val ticket = KdsTicket(
            ticketId = "tkt_${System.currentTimeMillis()}_${order.id}",
            order = order,
            station = station,
            status = OperationalStatus.QUEUED
        )
        ticketsMemory.add(ticket)
        return ticket
    }

    fun assign(ticketId: String, cookId: String): Result<KdsTicket> {
        val ticket = ticketsMemory.find { it.ticketId == ticketId }
            ?: return Result.failure(IllegalArgumentException("Ticket '$ticketId' no encontrado"))

        val updated = ticket.copy(assignedCookId = cookId)
        val idx = ticketsMemory.indexOfFirst { it.ticketId == ticketId }
        ticketsMemory[idx] = updated
        return Result.success(updated)
    }

    fun start(ticketId: String): Result<KdsTicket> {
        val ticket = ticketsMemory.find { it.ticketId == ticketId }
            ?: return Result.failure(IllegalArgumentException("Ticket '$ticketId' no encontrado"))

        val updated = ticket.copy(
            status = OperationalStatus.PREPARING,
            startedAt = System.currentTimeMillis(),
            isPaused = false
        )
        val idx = ticketsMemory.indexOfFirst { it.ticketId == ticketId }
        ticketsMemory[idx] = updated
        return Result.success(updated)
    }

    fun pause(ticketId: String): Result<KdsTicket> {
        val ticket = ticketsMemory.find { it.ticketId == ticketId }
            ?: return Result.failure(IllegalArgumentException("Ticket '$ticketId' no encontrado"))

        val updated = ticket.copy(isPaused = true)
        val idx = ticketsMemory.indexOfFirst { it.ticketId == ticketId }
        ticketsMemory[idx] = updated
        return Result.success(updated)
    }

    fun resume(ticketId: String): Result<KdsTicket> {
        val ticket = ticketsMemory.find { it.ticketId == ticketId }
            ?: return Result.failure(IllegalArgumentException("Ticket '$ticketId' no encontrado"))

        val updated = ticket.copy(isPaused = false)
        val idx = ticketsMemory.indexOfFirst { it.ticketId == ticketId }
        ticketsMemory[idx] = updated
        return Result.success(updated)
    }

    fun ready(ticketId: String): Result<KdsTicket> {
        val ticket = ticketsMemory.find { it.ticketId == ticketId }
            ?: return Result.failure(IllegalArgumentException("Ticket '$ticketId' no encontrado"))

        val updated = ticket.copy(
            status = OperationalStatus.READY,
            completedAt = System.currentTimeMillis()
        )
        val idx = ticketsMemory.indexOfFirst { it.ticketId == ticketId }
        ticketsMemory[idx] = updated
        return Result.success(updated)
    }

    fun bump(ticketId: String): Result<KdsTicket> {
        return ready(ticketId)
    }

    fun cancel(ticketId: String): Result<KdsTicket> {
        val ticket = ticketsMemory.find { it.ticketId == ticketId }
            ?: return Result.failure(IllegalArgumentException("Ticket '$ticketId' no encontrado"))

        ticketsMemory.removeIf { it.ticketId == ticketId }
        return Result.success(ticket)
    }

    fun getQueueByStation(restaurantId: String, station: KitchenStation? = null): List<KdsTicket> {
        return ticketsMemory.filter { tkt ->
            tkt.order.restaurantId == restaurantId && (station == null || tkt.station == station)
        }
    }
}
