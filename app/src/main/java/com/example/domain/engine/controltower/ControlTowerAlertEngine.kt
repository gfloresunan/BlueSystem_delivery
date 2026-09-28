package com.example.domain.engine.controltower

import com.example.domain.model.controltower.ControlTowerAlert
import com.example.domain.model.dashboard.AlertSeverity

/**
 * Motor de Generación de Alertas Operativas para DCT (ControlTowerAlertEngine)
 */
object ControlTowerAlertEngine {

    fun generateSystemAlerts(
        overdueCount: Int,
        outOfStockCount: Int,
        pausedCouriersCount: Int
    ): List<ControlTowerAlert> {
        val alerts = mutableListOf<ControlTowerAlert>()

        if (overdueCount > 0) {
            alerts.add(
                ControlTowerAlert(
                    id = "alt_overdue",
                    title = "Riesgo de SLA Incumplido ($overdueCount)",
                    message = "Hay $overdueCount pedido(s) superando el tiempo estándar de preparación.",
                    severity = AlertSeverity.CRITICAL,
                    category = "SLA"
                )
            )
        }

        if (outOfStockCount > 0) {
            alerts.add(
                ControlTowerAlert(
                    id = "alt_stock",
                    title = "Productos Agotados ($outOfStockCount)",
                    message = "Se detectaron $outOfStockCount producto(s) marcados sin existencia.",
                    severity = AlertSeverity.IMPORTANT,
                    category = "STOCK"
                )
            )
        }

        if (pausedCouriersCount >= 3) {
            alerts.add(
                ControlTowerAlert(
                    id = "alt_fleet",
                    title = "Flota Detenida o Pausada",
                    message = "$pausedCouriersCount repartidor(es) se encuentran pausados en la zona.",
                    severity = AlertSeverity.INFO,
                    category = "FLEET"
                )
            )
        }

        return alerts
    }
}
