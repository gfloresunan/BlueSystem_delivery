package com.example.domain.model.controltower

/**
 * Estaciones de Cocina Digital KDS
 */
enum class KdsStationType(val label: String) {
    GRILL("Parrilla / Grill 🥩"),
    FRYER("Freidora / Fryer 🍟"),
    DRINKS("Bebidas 🥤"),
    DESSERT("Postres 🍰"),
    ASSEMBLY("Empaque y Armado 📦")
}

data class KdsStationSummary(
    val stationType: KdsStationType,
    val pendingCount: Int = 0,
    val avgTimeMinutes: Int = 10,
    val isSaturated: Boolean = false
)
