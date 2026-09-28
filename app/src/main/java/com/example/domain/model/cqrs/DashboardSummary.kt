package com.example.domain.model.cqrs

/**
 * Modelo de Lectura CQRS: Documento Agregado Sintetizado para Business Dashboard (Objetivo 1 y 2).
 * Reemplaza listeners concurrentes sobre múltiples colecciones crudas por 1 sola lectura optimizada.
 */
data class DashboardSummary(
    val restaurantId: String = "",
    val branchId: String = "",
    val todaySales: Double = 0.0,
    val todayOrdersCount: Int = 0,
    val pendingOrdersCount: Int = 0,
    val preparingOrdersCount: Int = 0,
    val outOfStockProductsCount: Int = 0,
    val activePromotionsCount: Int = 0,
    val lastUpdatedAt: Long = System.currentTimeMillis()
)
