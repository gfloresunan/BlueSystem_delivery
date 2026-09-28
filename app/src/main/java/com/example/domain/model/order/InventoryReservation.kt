package com.example.domain.model.order

/**
 * Entidad de Reserva de Inventario con TTL y Reconciliación Transaccional.
 */
data class InventoryReservation(
    val id: String = "",
    val orderId: String = "",
    val restaurantId: String = "",
    val branchId: String = "",
    val productId: String = "",
    val quantity: Int = 1,
    val status: ReservationStatus = ReservationStatus.HELD,
    val ttlMinutes: Long = 15L,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + (15L * 60L * 1000L),
    val releaseReason: String? = null
)
