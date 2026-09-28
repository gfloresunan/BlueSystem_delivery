package com.example.domain.engine.orders

import com.example.domain.model.orders.SlaStatus

/**
 * Motor de Cálculo de SLA (SLA Engine MOOC)
 * Evalúa los tiempos transcurridos vs objetivo y asigna el nivel del semáforo.
 */
object SlaEngine {

    fun calculateSlaStatus(elapsedMinutes: Int, expectedPrepMinutes: Int = 20): SlaStatus {
        return when {
            elapsedMinutes <= expectedPrepMinutes -> SlaStatus.NORMAL
            elapsedMinutes <= expectedPrepMinutes + 5 -> SlaStatus.WARNING
            elapsedMinutes <= expectedPrepMinutes + 15 -> SlaStatus.CRITICAL
            else -> SlaStatus.BREACHED
        }
    }

    fun calculateDelayMinutes(elapsedMinutes: Int, expectedPrepMinutes: Int = 20): Int {
        return (elapsedMinutes - expectedPrepMinutes).coerceAtLeast(0)
    }
}
