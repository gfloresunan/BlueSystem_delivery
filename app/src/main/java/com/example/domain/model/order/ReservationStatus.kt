package com.example.domain.model.order

/**
 * Estado de Reserva de Inventario Transaccional (Hito 14).
 */
enum class ReservationStatus {
    HELD,
    CONSUMED,
    PARTIALLY_CONSUMED,
    RELEASED,
    EXPIRED
}
