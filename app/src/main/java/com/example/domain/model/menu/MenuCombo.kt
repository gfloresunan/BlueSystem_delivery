package com.example.domain.model.menu

enum class MenuComboStatus {
    ACTIVE,
    OUT_OF_STOCK,
    INACTIVE
}

/**
 * Entidad de Dominio: MenuCombo (v2.2 Enterprise)
 * Representa un Combo Real compuesto por múltiples slots configurables (ej: "Combo Familiar 2x1").
 */
data class MenuCombo(
    val id: String = "",
    val restaurantId: String = "",
    val name: String = "",
    val description: String = "",
    val basePrice: Double = 0.0,
    val fixedDiscount: Double = 0.0,
    val percentageDiscount: Double = 0.0,
    val slots: List<ComboItemSlot> = emptyList(),
    val status: MenuComboStatus = MenuComboStatus.ACTIVE,
    val orderIndex: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
