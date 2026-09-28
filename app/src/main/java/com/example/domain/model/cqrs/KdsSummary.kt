package com.example.domain.model.cqrs

/**
 * Modelo de Lectura CQRS: Documento Agregado para KDS (Objetivo 1 y 4).
 * Resume la cola activa de cocina evitando consultar la colección completa de pedidos.
 */
data class KdsSummary(
    val restaurantId: String = "",
    val branchId: String = "",
    val activeTicketsCount: Int = 0,
    val queuedTicketsCount: Int = 0,
    val preparingTicketsCount: Int = 0,
    val assemblingTicketsCount: Int = 0,
    val avgPrepTimeMs: Long = 0L,
    val delayedTicketsCount: Int = 0,
    val lastUpdatedAt: Long = System.currentTimeMillis()
)
