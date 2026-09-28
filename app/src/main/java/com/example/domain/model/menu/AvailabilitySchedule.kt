package com.example.domain.model.menu

/**
 * Entidad de Dominio: AvailabilitySchedule (v2.2 Enterprise)
 * Representa un calendario completo de disponibilidad horaria por restaurante y sucursal.
 */
data class AvailabilitySchedule(
    val id: String = "",
    val restaurantId: String = "",
    val branchId: String? = null,
    val name: String = "",
    val weeklySchedules: List<DaySchedule> = emptyList(),
    val isTemporaryPaused: Boolean = false,
    val pausedUntilTimestamp: Long? = null, // Pausa temporal con expiración en milisegundos
    val pauseReason: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
