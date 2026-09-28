package com.example.domain.engine.kds

import com.example.domain.model.order.Order

data class OrderTimerMetrics(
    val expectedPrepTimeMinutes: Int,
    val elapsedTimeMinutes: Long,
    val isDelayed: Boolean,
    val delayMinutes: Long,
    val estimatedCompletionTime: Long
)

/**
 * Servidor de Dominio: KitchenTimerEngine (Hito 14)
 * Calcula tiempos de preparación esperados, tiempo transcurrido, retrasos y predicciones por estación y total.
 */
class KitchenTimerEngine {

    fun calculateTimerMetrics(
        order: Order,
        currentTimeMillis: Long = System.currentTimeMillis()
    ): OrderTimerMetrics {
        // Tiempo estimado por defecto: 15 mins base + 2 mins por item
        val expectedMinutes = 15 + (order.items.size * 2)
        val elapsedMillis = currentTimeMillis - order.createdAt
        val elapsedMinutes = elapsedMillis / (60L * 1000L)

        val isDelayed = elapsedMinutes > expectedMinutes
        val delayMinutes = if (isDelayed) elapsedMinutes - expectedMinutes else 0L
        val estimatedCompletionTime = order.createdAt + (expectedMinutes * 60L * 1000L)

        return OrderTimerMetrics(
            expectedPrepTimeMinutes = expectedMinutes,
            elapsedTimeMinutes = elapsedMinutes,
            isDelayed = isDelayed,
            delayMinutes = delayMinutes,
            estimatedCompletionTime = estimatedCompletionTime
        )
    }
}
