package com.example.domain.model.menu

/**
 * Entidad de Dominio: TimeRange (v2.2 Enterprise)
 * Representa una franja horaria en formato 24h ("07:00" a "11:00").
 */
data class TimeRange(
    val startTime: String = "00:00", // HH:mm
    val endTime: String = "23:59"    // HH:mm
)
