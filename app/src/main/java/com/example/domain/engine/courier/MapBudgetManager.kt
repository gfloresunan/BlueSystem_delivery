package com.example.domain.engine.courier

import com.example.AuditLogger
import com.example.domain.model.AuditSeverity
import com.example.domain.model.courier.ApiConsumptionReason
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Estado financiero y métricas de presupuesto de consumo de APIs de mapas.
 */
data class MapBudgetStatus(
    val dailyBudgetUsd: Double = 50.00,
    val accumulatedCostTodayUsd: Double = 0.00,
    val queryCountToday: Int = 0,
    val monthlyBudgetUsd: Double = 1500.00,
    val accumulatedCostMonthUsd: Double = 0.00,
    val queryCountMonth: Int = 0
) {
    val dailyPercentageUsed: Double
        get() = if (dailyBudgetUsd > 0) (accumulatedCostTodayUsd / dailyBudgetUsd) * 100.0 else 0.0

    val monthlyPercentageUsed: Double
        get() = if (monthlyBudgetUsd > 0) (accumulatedCostMonthUsd / monthlyBudgetUsd) * 100.0 else 0.0
}

/**
 * Motor de Gestión de Presupuesto y Control Financiero de APIs de Mapas (MapBudgetManager).
 */
class MapBudgetManager(
    private val estimatedCostPerQueryUsd: Double = 0.005
) {

    private val _budgetStatus = MutableStateFlow(MapBudgetStatus())
    val budgetStatus: StateFlow<MapBudgetStatus> = _budgetStatus.asStateFlow()

    /**
     * Registra el consumo de una llamada a la API externa de Directions/Distance Matrix.
     */
    fun recordApiQuery(reason: ApiConsumptionReason, estimatedTimeSavedMinutes: Double = 0.0) {
        _budgetStatus.update { current ->
            val newQueryCountToday = current.queryCountToday + 1
            val newCostToday = newQueryCountToday * estimatedCostPerQueryUsd
            val newQueryCountMonth = current.queryCountMonth + 1
            val newCostMonth = newQueryCountMonth * estimatedCostPerQueryUsd

            current.copy(
                queryCountToday = newQueryCountToday,
                accumulatedCostTodayUsd = newCostToday,
                queryCountMonth = newQueryCountMonth,
                accumulatedCostMonthUsd = newCostMonth
            )
        }

        val updated = _budgetStatus.value
        val pct = updated.dailyPercentageUsed

        // Log de Telemetría Financiera (Cost Telemetry)
        AuditLogger.logEvent(
            event = "DIRECTIONS_API_USAGE_LOGGED",
            details = mapOf(
                "reason" to reason.name,
                "costUsd" to estimatedCostPerQueryUsd,
                "dailyCostTotalUsd" to updated.accumulatedCostTodayUsd,
                "dailyPctUsed" to String.format("%.1f%%", pct),
                "estimatedTimeSavedMin" to estimatedTimeSavedMinutes
            ),
            severity = if (pct >= 100.0) AuditSeverity.CRITICAL else if (pct >= 80.0) AuditSeverity.WARNING else AuditSeverity.INFO
        )
    }

    /**
     * Resetea el contador diario (al inicio de cada jornada).
     */
    fun resetDailyBudget() {
        _budgetStatus.update {
            it.copy(accumulatedCostTodayUsd = 0.0, queryCountToday = 0)
        }
    }
}
