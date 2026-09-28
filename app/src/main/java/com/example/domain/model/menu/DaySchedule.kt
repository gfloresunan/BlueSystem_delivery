package com.example.domain.model.menu

import java.time.DayOfWeek

/**
 * Entidad de Dominio: DaySchedule (v2.2 Enterprise)
 * Representa la configuración horaria para un día específico de la semana.
 */
data class DaySchedule(
    val dayOfWeek: DayOfWeek = DayOfWeek.MONDAY,
    val timeRanges: List<TimeRange> = emptyList(),
    val isOpen: Boolean = true
)
