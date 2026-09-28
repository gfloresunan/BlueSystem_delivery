package com.example.domain.engine.menu

/**
 * Modelo de Telemetría para Monitoreo de Publicaciones de Menú.
 */
data class PublishTelemetry(
    val restaurantId: String = "",
    val branchId: String = "",
    val semanticVersion: String = "",
    val publishDurationMs: Long = 0L,
    val productCount: Int = 0,
    val categoryCount: Int = 0,
    val snapshotSizeBytes: Long = 0L,
    val isSuccess: Boolean = true,
    val errorMessage: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)
