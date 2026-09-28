package com.example.domain.model.menu

/**
 * Entidad de Dominio: MenuCategory (Categoría de Menú v2.2)
 * Representa una sección organizada del menú para un restaurante.
 */
data class MenuCategory(
    val id: String = "",
    val restaurantId: String = "",
    val primaryName: String = "",
    val description: String = "",
    val imageUrl: String = "",
    val orderIndex: Int = 0,
    val isActive: Boolean = true,
    val availabilityScheduleId: String? = null,
    val versionNumber: Long = 1L,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
