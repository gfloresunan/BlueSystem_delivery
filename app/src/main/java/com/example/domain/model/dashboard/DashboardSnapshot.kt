package com.example.domain.model.dashboard

/**
 * Modelo de Snapshot de usuario para el layout del Dashboard (DashboardSnapshot)
 * Permite guardar preferencias personalizadas por empleado (`userId` + `businessId`).
 */
data class DashboardSnapshot(
    val userId: String = "",
    val businessId: String = "",
    val activeProfile: DashboardProfileType = DashboardProfileType.OPERATIONS,
    val widgetsConfig: List<MerchantDashboardWidget> = emptyList(),
    val dailyGoalTarget: Double = 5000.0,
    val updatedAt: Long = System.currentTimeMillis()
)
