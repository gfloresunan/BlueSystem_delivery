package com.example.domain.model.controltower

import com.example.domain.model.dashboard.AlertSeverity

/**
 * Modelo de Alerta Operativa para el DCT
 */
data class ControlTowerAlert(
    val id: String,
    val title: String,
    val message: String,
    val severity: AlertSeverity = AlertSeverity.IMPORTANT,
    val category: String = "SLA", // SLA, FLEET, KDS, STOCK, REFUND
    val timestampMs: Long = System.currentTimeMillis()
)
