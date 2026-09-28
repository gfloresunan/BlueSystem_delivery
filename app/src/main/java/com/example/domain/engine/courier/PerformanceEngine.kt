package com.example.domain.engine.courier

import com.example.domain.model.courier.CourierMetrics
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Motor de telemetría de rendimiento y métricas operativas (PerformanceEngine).
 */
class PerformanceEngine {

    private val _metrics = MutableStateFlow(CourierMetrics())
    val metrics: StateFlow<CourierMetrics> = _metrics.asStateFlow()

    fun initialize(courierId: String) {
        _metrics.value = CourierMetrics(courierId = courierId)
    }

    fun recordCompletedOrder(earnings: Double, distanceKm: Double, rating: Double? = null) {
        _metrics.update { m ->
            val newCount = m.completedOrdersCount + 1
            val newEarnings = m.totalEarningsAmount + earnings
            val newKm = m.totalDistanceTraveledKm + distanceKm
            val newRating = if (rating != null) {
                ((m.averageRating * m.completedOrdersCount) + rating) / newCount
            } else m.averageRating

            m.copy(
                completedOrdersCount = newCount,
                totalEarningsAmount = newEarnings,
                totalDistanceTraveledKm = newKm,
                averageRating = newRating
            )
        }
    }

    fun recordCancelledOrder() {
        _metrics.update { m ->
            m.copy(cancelledOrdersCount = m.cancelledOrdersCount + 1)
        }
    }

    fun addTimeAtStore(durationMs: Long) {
        _metrics.update { m ->
            m.copy(totalTimeAtStoreMs = m.totalTimeAtStoreMs + durationMs)
        }
    }

    fun addTimeWaitingCustomer(durationMs: Long) {
        _metrics.update { m ->
            m.copy(totalTimeWaitingCustomerMs = m.totalTimeWaitingCustomerMs + durationMs)
        }
    }

    fun addEffectiveWorkTime(durationMs: Long) {
        _metrics.update { m ->
            m.copy(totalEffectiveWorkTimeMs = m.totalEffectiveWorkTimeMs + durationMs)
        }
    }
}
