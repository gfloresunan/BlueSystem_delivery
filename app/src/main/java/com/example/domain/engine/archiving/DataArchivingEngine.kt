package com.example.domain.engine.archiving

import com.example.domain.model.order.Order

data class ArchivingSummary(
    val activeOrdersCount: Int,
    val archivedOrdersCount: Int,
    val freedBytesEstimate: Long
)

/**
 * Servidor de Dominio: DataArchivingEngine (Objetivo 13).
 * Implementa políticas automáticas de archivado moviendo pedidos mayores a 90 días
 * desde la colección activa `orders` hacia `orders_archive` para mantener rápida la base de datos.
 */
class DataArchivingEngine(
    private val retentionDaysThreshold: Int = 90
) {

    fun executeOrdersArchivingPolicy(
        activeOrders: List<Order>,
        currentTimeMillis: Long = System.currentTimeMillis()
    ): Pair<List<Order>, List<Order>> {
        val retentionThresholdMillis = currentTimeMillis - (retentionDaysThreshold.toLong() * 24L * 60L * 60L * 1000L)

        val remainingActive = mutableListOf<Order>()
        val toArchive = mutableListOf<Order>()

        activeOrders.forEach { order ->
            if (order.createdAt < retentionThresholdMillis) {
                toArchive.add(order)
            } else {
                remainingActive.add(order)
            }
        }

        return Pair(remainingActive, toArchive)
    }
}
