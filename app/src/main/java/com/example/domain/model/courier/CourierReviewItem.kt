package com.example.domain.model.courier

/**
 * Modelo inmutable representativo de una reseña u opinión de cliente hacia un repartidor.
 * Protocolo: BSD-COURIER-PERFORMANCE-HISTORY-DATA-HOMOLOGATION-001
 * Fuente canónica: /reviews/{orderId} con courierId == currentCourierUid
 */
data class CourierReviewItem(
    val orderId: String = "",
    val rating: Int = 5,
    val comment: String = "",
    val customerName: String = "Cliente",
    val date: String = "",
    val timestampMs: Long = 0L
)
