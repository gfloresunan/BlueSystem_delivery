package com.example.domain.model.orders

/**
 * Modelo de Registro de Incidencias (Centro de Incidencias MOOC)
 */
enum class IncidentType(val label: String) {
    CUSTOMER_UNRESPONSIVE("Cliente no responde"),
    WRONG_ADDRESS("Dirección incorrecta / Incompleta"),
    PRODUCT_OUT_OF_STOCK("Producto agotado en cocina"),
    PAYMENT_REJECTED("Pago o transferencia rechazada"),
    COURIER_BREAKDOWN("Motorizado con avería o accidente"),
    FAILED_DELIVERY("Entrega no completada")
}

enum class IncidentStatus {
    OPEN,
    IN_PROGRESS,
    RESOLVED,
    CANCELLED
}

data class OrderIncident(
    val id: String = "",
    val orderId: String = "",
    val type: IncidentType = IncidentType.CUSTOMER_UNRESPONSIVE,
    val description: String = "",
    val photoUrl: String? = null,
    val status: IncidentStatus = IncidentStatus.OPEN,
    val createdAtMs: Long = System.currentTimeMillis(),
    val resolvedAtMs: Long? = null,
    val resolutionNotes: String? = null
)
