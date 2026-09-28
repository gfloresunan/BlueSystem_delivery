package com.example.domain.model.menu

/**
 * Entidad de Dominio: MenuOptionGroup (v2.2 Enterprise)
 * Representa un grupo de opciones personalizables vinculable a múltiples productos (N:M).
 * Ejemplos: "Elije tu bebida", "Ingredientes adicionales", "Término de la carne".
 */
data class MenuOptionGroup(
    val id: String = "",
    val restaurantId: String = "",
    val name: String = "",
    val description: String = "",
    val minSelection: Int = 0,
    val maxSelection: Int = 1,
    val isRequired: Boolean = false,
    val allowFreeOptionsCount: Int = 0,
    val orderIndex: Int = 0,
    val optionIds: List<String> = emptyList(),
    val options: List<MenuOption> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
