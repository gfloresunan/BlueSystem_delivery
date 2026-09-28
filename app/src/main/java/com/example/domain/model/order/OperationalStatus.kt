package com.example.domain.model.order

/**
 * Estado Operativo de Cocina y Despacho del Pedido (Hito 14 - Desacoplado del Flujo Financiero).
 */
enum class OperationalStatus {
    QUEUED,
    PREPARING,
    ASSEMBLING,
    READY,
    PACKED,
    OUT_FOR_DELIVERY,
    DELIVERED
}
