package com.example.domain.model.menu

/**
 * Contrato de Salida Inmutable: AvailabilityResult (v2.2 Enterprise)
 */
data class AvailabilityResult(
    val isAvailable: Boolean = true,
    val reason: String = "AVAILABLE",
    val nextAvailableTime: String? = null,
    val isStockDepleted: Boolean = false,
    val isTemporaryPaused: Boolean = false
)
