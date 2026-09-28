package com.example.domain.model.controltower

/**
 * Desglose del Tiempo Estimado de Llegada (ETA Center MOOC/DCT)
 */
data class EtaBreakdown(
    val kitchenPrepMinutes: Int = 12,
    val dispatchMinutes: Int = 3,
    val travelMinutes: Int = 10,
    val totalEtaMinutes: Int = kitchenPrepMinutes + dispatchMinutes + travelMinutes
)
