package com.example.domain.model.orders

import androidx.compose.ui.graphics.Color

/**
 * Nivel de SLA y Semáforo del Pedido
 */
enum class SlaStatus(val label: String, val badgeColor: Color) {
    NORMAL("A TIEMPO", Color(0xFF10B981)),       // Verde
    WARNING("EN RIESGO", Color(0xFFF59E0B)),      // Amarillo
    CRITICAL("URGENTE", Color(0xFFEF4444)),       // Rojo
    BREACHED("SLA INCUMPLIDO", Color(0xFF0F172A)) // Negro
}
