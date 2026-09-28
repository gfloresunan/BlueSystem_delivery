package com.example.domain.model.order

/**
 * Estado Comercial Financiero del Pedido (Hito 14 - Desacoplado del Flujo de Cocina).
 */
enum class CommercialStatus {
    CREATED,
    PENDING_PAYMENT,
    CONFIRMED,
    CANCELLED,
    REFUNDED
}
