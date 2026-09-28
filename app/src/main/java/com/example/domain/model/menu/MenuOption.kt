package com.example.domain.model.menu

/**
 * Estado de Disponibilidad de una Opción Individual.
 */
enum class MenuOptionStatus {
    ACTIVE,
    OUT_OF_STOCK,
    INACTIVE
}

/**
 * Entidad de Dominio: MenuOption (v2.2 Enterprise)
 * Representa una opción individual dentro de un grupo (ej: "Extra Queso", "Salsa BBQ", "Sin Cebolla").
 */
data class MenuOption(
    val id: String = "",
    val groupId: String = "",
    val restaurantId: String = "",
    val name: String = "",
    val additionalPrice: Double = 0.0,
    val isDefault: Boolean = false,
    val status: MenuOptionStatus = MenuOptionStatus.ACTIVE,
    val orderIndex: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
