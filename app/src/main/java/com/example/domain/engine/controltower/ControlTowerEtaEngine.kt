package com.example.domain.engine.controltower

import com.example.domain.model.controltower.EtaBreakdown

/**
 * Motor de Cálculo de ETA (ControlTowerEtaEngine DCT)
 * Reutilizable al 100% para el Merchant Web Portal (Sprint 16).
 */
object ControlTowerEtaEngine {

    fun calculateEtaBreakdown(kitchenPrepMin: Int = 12, distanceKm: Double = 2.4): EtaBreakdown {
        val dispatchMin = 3
        val travelMin = (distanceKm * 4).toInt().coerceAtLeast(5)
        val total = kitchenPrepMin + dispatchMin + travelMin

        return EtaBreakdown(
            kitchenPrepMinutes = kitchenPrepMin,
            dispatchMinutes = dispatchMin,
            travelMinutes = travelMin,
            totalEtaMinutes = total
        )
    }
}
