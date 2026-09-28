package com.example.domain.model.orders

/**
 * Hito del Timeline del Pedido (Order Timeline Engine)
 */
data class OrderTimelineStep(
    val stepName: String,
    val timestampFormatted: String,
    val isCompleted: Boolean = true,
    val isCurrent: Boolean = false
)
