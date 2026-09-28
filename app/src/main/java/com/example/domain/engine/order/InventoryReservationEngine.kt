package com.example.domain.engine.order

import com.example.domain.model.order.InventoryReservation
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus

/**
 * Servidor de Dominio: InventoryReservationEngine (Hito 14)
 * Administra las reservas de inventario en estado HELD, la reconciliación transaccional,
 * el rollback automático ante cancelaciones y la expiración por TTL (Time-To-Live).
 */
class InventoryReservationEngine {

    private val reservationsMemory = mutableListOf<InventoryReservation>()

    fun reserveInventory(
        orderId: String,
        restaurantId: String,
        branchId: String,
        items: List<OrderItem>,
        ttlMinutes: Long = 15L
    ): Result<List<InventoryReservation>> {
        if (items.isEmpty()) {
            return Result.failure(IllegalArgumentException("No se pueden reservar ítems en una lista vacía"))
        }

        val newReservations = items.map { item ->
            val now = System.currentTimeMillis()
            InventoryReservation(
                id = "res_${now}_${item.productId}",
                orderId = orderId,
                restaurantId = restaurantId,
                branchId = branchId,
                productId = item.productId,
                quantity = item.quantity,
                status = ReservationStatus.HELD,
                ttlMinutes = ttlMinutes,
                createdAt = now,
                expiresAt = now + (ttlMinutes * 60L * 1000L)
            )
        }

        reservationsMemory.addAll(newReservations)
        return Result.success(newReservations)
    }

    fun consumeReservationsForOrder(orderId: String): Result<List<InventoryReservation>> {
        val updatedList = mutableListOf<InventoryReservation>()
        val matches = reservationsMemory.filter { it.orderId == orderId && it.status == ReservationStatus.HELD }

        if (matches.isEmpty()) {
            return Result.failure(IllegalStateException("No se encontraron reservas HELD activas para la orden '$orderId'"))
        }

        matches.forEach { res ->
            val updated = res.copy(status = ReservationStatus.CONSUMED)
            val idx = reservationsMemory.indexOfFirst { it.id == res.id }
            if (idx >= 0) reservationsMemory[idx] = updated
            updatedList.add(updated)
        }

        return Result.success(updatedList)
    }

    fun rollbackReservationsForOrder(orderId: String, reason: String = "CANCELLED"): Result<List<InventoryReservation>> {
        val updatedList = mutableListOf<InventoryReservation>()
        val matches = reservationsMemory.filter { it.orderId == orderId && (it.status == ReservationStatus.HELD || it.status == ReservationStatus.PARTIALLY_CONSUMED) }

        matches.forEach { res ->
            val updated = res.copy(status = ReservationStatus.RELEASED, releaseReason = reason)
            val idx = reservationsMemory.indexOfFirst { it.id == res.id }
            if (idx >= 0) reservationsMemory[idx] = updated
            updatedList.add(updated)
        }

        return Result.success(updatedList)
    }

    fun checkAndCleanupExpiredReservations(currentTimeMillis: Long = System.currentTimeMillis()): List<InventoryReservation> {
        val expiredList = mutableListOf<InventoryReservation>()
        val activeReservations = reservationsMemory.filter { it.status == ReservationStatus.HELD }

        activeReservations.forEach { res ->
            if (currentTimeMillis > res.expiresAt) {
                val expired = res.copy(status = ReservationStatus.EXPIRED, releaseReason = "TTL_EXPIRED")
                val idx = reservationsMemory.indexOfFirst { it.id == res.id }
                if (idx >= 0) reservationsMemory[idx] = expired
                expiredList.add(expired)
            }
        }

        return expiredList
    }

    fun getReservationsForOrder(orderId: String): List<InventoryReservation> {
        return reservationsMemory.filter { it.orderId == orderId }
    }
}
