package com.example.domain.model.dashboard

/**
 * Modelo de Meta del Día (Daily Sales Goal Progress Tracker)
 */
data class DashboardGoal(
    val targetAmount: Double = 5000.0,
    val currentAmount: Double = 0.0,
    val currencySymbol: String = "C$"
) {
    val progressPercentage: Float
        get() = if (targetAmount > 0) ((currentAmount / targetAmount) * 100).toFloat().coerceIn(0f, 100f) else 0f
}
