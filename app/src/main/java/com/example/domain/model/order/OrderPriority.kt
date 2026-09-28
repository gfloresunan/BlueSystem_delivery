package com.example.domain.model.order

/**
 * Nivel de Prioridad operacional del pedido para cola KDS.
 */
enum class OrderPriority {
    URGENT,
    VIP,
    HIGH,
    NORMAL,
    FIFO
}
