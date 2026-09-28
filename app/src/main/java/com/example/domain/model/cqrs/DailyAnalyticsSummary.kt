package com.example.domain.model.cqrs

/**
 * Modelo de Lectura CQRS: Documento Agregado Diario de Analytics (Objetivo 7).
 * Evita barridos históricos de tabla recalculando indicadores mediante eventos.
 */
data class DailyAnalyticsSummary(
    val dateStr: String = "", // Formato YYYY-MM-DD
    val restaurantId: String = "",
    val totalSales: Double = 0.0,
    val totalOrders: Int = 0,
    val averageOrderValue: Double = 0.0,
    val cancellationRate: Double = 0.0,
    val topProductIds: List<String> = emptyList(),
    val lastUpdatedAt: Long = System.currentTimeMillis()
)
