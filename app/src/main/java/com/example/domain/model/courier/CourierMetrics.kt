package com.example.domain.model.courier

/**
 * Modelo de métricas analíticas granulares para evaluación de rendimiento del repartidor y modelos de IA.
 */
data class CourierMetrics(
    val courierId: String = "",
    val totalDistanceTraveledKm: Double = 0.0,
    val totalStoppedTimeMs: Long = 0L,
    val totalTimeAtStoreMs: Long = 0L,
    val totalTimeWaitingCustomerMs: Long = 0L,
    val totalEffectiveWorkTimeMs: Long = 0L,
    val totalOnlineTimeMs: Long = 0L,
    val totalOfflineTimeMs: Long = 0L,
    val completedOrdersCount: Int = 0,
    val completedCommerceTrips: Int = 0,
    val completedX2YTrips: Int = 0,
    val completedTotalTrips: Int = 0,
    val cancelledOrdersCount: Int = 0,
    val totalEarningsAmount: Double = 0.0,
    val averageRating: Double = 0.0,
    val ratingCount: Int = 0
) {
    val ordersPerHour: Double
        get() {
            val hours = totalEffectiveWorkTimeMs / 3600000.0
            return if (hours > 0) completedOrdersCount / hours else 0.0
        }

    val earningsPerHour: Double
        get() {
            val hours = totalEffectiveWorkTimeMs / 3600000.0
            return if (hours > 0) totalEarningsAmount / hours else 0.0
        }

    val earningsPerKm: Double
        get() = if (totalDistanceTraveledKm > 0) totalEarningsAmount / totalDistanceTraveledKm else 0.0

    val completionRate: Double
        get() {
            val total = completedOrdersCount + cancelledOrdersCount
            return if (total > 0) (completedOrdersCount.toDouble() / total) * 100.0 else 100.0
        }
}
