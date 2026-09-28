package com.example.domain.model.menu

/**
 * Entidad de Dominio: ProductSize (v2.2 Enterprise)
 * Representa una dimensión de tamaño (ej: "Personal", "Mediana", "Familiar", "1 Litro").
 */
data class ProductSize(
    val id: String = "",
    val name: String = "",
    val priceAdjustment: Double = 0.0, // Monto a sumar o restar del precio base
    val priceMultiplier: Double = 1.0, // Factor multiplicador opcional
    val orderIndex: Int = 0
)
