package com.example.eiam.presentation.ui.bsds.theme

import androidx.compose.ui.graphics.Color

/**
 * 🎨 BDLContext - Contextos Semánticos de BDL v2.0 (ADR-006)
 * Asigna significado cromático e identidad visual instantánea a cada ámbito funcional.
 */
enum class BDLContext(
    val color: Color,
    val hexCode: String,
    val displayName: String
) {
    Operations(
        color = Color(0xFF22C55E),
        hexCode = "#22C55E",
        displayName = "Operación"
    ),
    Finance(
        color = Color(0xFFF59E0B),
        hexCode = "#F59E0B",
        displayName = "Finanzas"
    ),
    Customers(
        color = Color(0xFF2563EB),
        hexCode = "#2563EB",
        displayName = "Clientes"
    ),
    Delivery(
        color = Color(0xFF06B6D4),
        hexCode = "#06B6D4",
        displayName = "Delivery"
    ),
    Kitchen(
        color = Color(0xFFF97316),
        hexCode = "#F97316",
        displayName = "Cocina"
    ),
    AI(
        color = Color(0xFF4F46E5),
        hexCode = "#4F46E5",
        displayName = "BlueSystem AI"
    ),
    Security(
        color = Color(0xFFEF4444),
        hexCode = "#EF4444",
        displayName = "Seguridad"
    ),
    Offline(
        color = Color(0xFF6B7280),
        hexCode = "#6B7280",
        displayName = "Offline"
    )
}
