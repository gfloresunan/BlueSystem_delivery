package com.example.domain.model.menu

/**
 * Entidad de Dominio: MenuSnapshot (Snapshot Inmutable Enterprise)
 * Representa una fotografía completa, inmutable y firmada digitalmente del estado del menú.
 */
data class MenuSnapshot(
    val id: String = "",
    val restaurantId: String = "",
    val branchId: String = "",
    val semanticVersion: String = "v2.3.0",
    val publishedAt: Long = System.currentTimeMillis(),
    val publisherUserId: String = "",
    val changeReason: String = "",
    val status: MenuSnapshotStatus = MenuSnapshotStatus.PUBLISHED,
    val sha256Checksum: String = "",
    val schemaVersion: String = "v2.2",
    val categories: List<MenuCategory> = emptyList(),
    val products: List<MenuProduct> = emptyList(),
    val variants: List<ProductVariant> = emptyList(),
    val options: List<MenuOptionGroup> = emptyList(),
    val combos: List<MenuCombo> = emptyList(),
    val promotions: List<MenuPromotion> = emptyList(),
    val schedules: List<AvailabilitySchedule> = emptyList()
)
