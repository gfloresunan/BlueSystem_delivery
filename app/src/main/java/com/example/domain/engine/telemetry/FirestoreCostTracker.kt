package com.example.domain.engine.telemetry

data class RestaurantCostMetrics(
    val restaurantId: String = "",
    val readsCount: Long = 0L,
    val writesCount: Long = 0L,
    val storageBytes: Long = 0L,
    val cloudFunctionsCount: Long = 0L,
    val estimatedMonthlyCostUsd: Double = 0.0,
    val isBudgetExceeded: Boolean = false
)

/**
 * Servidor de Dominio: FirestoreCostTracker (Objetivo 10).
 * Monitorea el consumo de lecturas, escrituras, almacenamiento y Cloud Functions por restaurante,
 * estimando el costo operativo mensual en USD para prevenir incrementos desmedidos.
 */
class FirestoreCostTracker(
    private val monthlyBudgetThresholdUsd: Double = 50.0
) {

    private val metricsMap = mutableMapOf<String, RestaurantCostMetrics>()

    fun trackOperation(
        restaurantId: String,
        reads: Long = 0L,
        writes: Long = 0L,
        storageBytes: Long = 0L,
        cloudFunctions: Long = 0L
    ): RestaurantCostMetrics {
        val current = metricsMap[restaurantId] ?: RestaurantCostMetrics(restaurantId = restaurantId)

        val newReads = current.readsCount + reads
        val newWrites = current.writesCount + writes
        val newStorage = current.storageBytes + storageBytes
        val newFunctions = current.cloudFunctionsCount + cloudFunctions

        // Tarifas estándar Firestore: $0.06 / 100K lecturas, $0.18 / 100K escrituras
        val readsCost = (newReads.toDouble() / 100_000.0) * 0.06
        val writesCost = (newWrites.toDouble() / 100_000.0) * 0.18
        val functionsCost = (newFunctions.toDouble() / 1_000_000.0) * 0.40
        val totalCostUsd = readsCost + writesCost + functionsCost

        val updated = current.copy(
            readsCount = newReads,
            writesCount = newWrites,
            storageBytes = newStorage,
            cloudFunctionsCount = newFunctions,
            estimatedMonthlyCostUsd = totalCostUsd,
            isBudgetExceeded = totalCostUsd > monthlyBudgetThresholdUsd
        )

        metricsMap[restaurantId] = updated
        return updated
    }

    fun getMetricsForRestaurant(restaurantId: String): RestaurantCostMetrics {
        return metricsMap[restaurantId] ?: RestaurantCostMetrics(restaurantId = restaurantId)
    }
}
