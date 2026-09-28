package com.example.domain.engine.controltower

import com.example.domain.model.controltower.FleetCourier
import com.example.domain.model.controltower.FleetCourierStatus

/**
 * Motor de Mapa Operacional de Flota (FleetMapEngine DCT)
 * Reutilizable al 100% para el Merchant Web Portal (Sprint 16).
 */
object FleetMapEngine {

    fun filterCouriersByStatus(couriers: List<FleetCourier>, statusFilter: FleetCourierStatus?): List<FleetCourier> {
        if (statusFilter == null) return couriers
        return couriers.filter { it.status == statusFilter }
    }

    fun calculateActiveCouriersCount(couriers: List<FleetCourier>): Int {
        return couriers.count { it.status != FleetCourierStatus.OFFLINE && it.status != FleetCourierStatus.PAUSED }
    }
}
