package com.example.domain.model.menu

/**
 * Entidad de Dominio: MenuVersion (Control de Versiones de Menú v2.2)
 * Almacena el estado de síntesis y hash canónico SHA-256 para la invalidación
 * de cache y sincronización incremental en clientes móviles.
 */
data class MenuVersion(
    val id: String = "",
    val restaurantId: String = "",
    val version: Long = 1L,
    val checksum: String = "",
    val generatedAt: Long = System.currentTimeMillis(),
    val publishedAt: Long? = null,
    val generatedBy: String = "SYSTEM",
    val schemaVersion: String = "2.2.0",
    val menuHash: String = "",
    val status: MenuVersionStatus = MenuVersionStatus.BUILDING
)
