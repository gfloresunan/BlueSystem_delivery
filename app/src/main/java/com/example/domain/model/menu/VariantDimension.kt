package com.example.domain.model.menu

/**
 * Entidad de Dominio: VariantDimension (v2.2 Enterprise)
 * Representa una dimensión de configuración (ej: "Tipo de Masa", "Término de la Carne", "Sabor de Jarabe").
 */
data class VariantDimension(
    val id: String = "",
    val name: String = "",
    val options: List<String> = emptyList(), // Ej: ["Masa Delgado", "Masa Gruesa", "Masa Rellena de Queso"]
    val orderIndex: Int = 0
)
