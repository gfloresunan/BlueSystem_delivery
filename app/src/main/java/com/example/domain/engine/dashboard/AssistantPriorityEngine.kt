package com.example.domain.engine.dashboard

enum class InsightPriority {
    URGENT_CRITICAL,  // Prioridad 1: Pedidos atrasados, productos agotados
    WARNING_ACTION,   // Prioridad 2: Stock bajo, promo por vencer, baja de ticket
    POSITIVE_INFO     // Prioridad 3: Hito de ventas alcanzado, calificación alta
}

data class PriorityInsight(
    val priority: InsightPriority,
    val title: String,
    val message: String,
    val actionText: String? = null,
    val targetTab: String = "ORDERS"
)

/**
 * Motor de Priorización de Insights para Merchant Assistant
 */
object AssistantPriorityEngine {

    fun evaluateInsights(
        overdueOrdersCount: Int,
        outOfStockCount: Int,
        lowStockCount: Int,
        todaySales: Double,
        ticketDropPercentage: Double = 0.0
    ): List<PriorityInsight> {
        val list = mutableListOf<PriorityInsight>()

        if (overdueOrdersCount > 0) {
            list.add(
                PriorityInsight(
                    priority = InsightPriority.URGENT_CRITICAL,
                    title = "⚠️ Pedidos Atrasados",
                    message = "Tienes $overdueOrdersCount pedido(s) con más de 10 min en preparación.",
                    actionText = "Ver Pedidos",
                    targetTab = "ORDERS"
                )
            )
        }

        if (outOfStockCount > 0) {
            list.add(
                PriorityInsight(
                    priority = InsightPriority.URGENT_CRITICAL,
                    title = "🛑 Productos Agotados",
                    message = "Tienes $outOfStockCount producto(s) en 0 stock. Reactívalos si ingresaron insumos.",
                    actionText = "Revisar Stock",
                    targetTab = "MENU"
                )
            )
        }

        if (ticketDropPercentage > 10.0) {
            list.add(
                PriorityInsight(
                    priority = InsightPriority.WARNING_ACTION,
                    title = "📉 Bajada de Ticket Promedio",
                    message = "Tu ticket promedio cayó un ${ticketDropPercentage.toInt()}%. Se recomienda ajustar productos en oferta.",
                    actionText = "Ver Menú",
                    targetTab = "MENU"
                )
            )
        }

        if (lowStockCount > 0) {
            list.add(
                PriorityInsight(
                    priority = InsightPriority.WARNING_ACTION,
                    title = "📦 Alerta de Reabastecimiento",
                    message = "$lowStockCount productos están cerca de su stock mínimo.",
                    actionText = "Ver Inventario",
                    targetTab = "MENU"
                )
            )
        }

        if (todaySales > 1000.0) {
            list.add(
                PriorityInsight(
                    priority = InsightPriority.POSITIVE_INFO,
                    title = "🚀 Hito de Ventas",
                    message = "¡Felicidades! Superaste los C$ ${todaySales.toInt()} en ventas hoy.",
                    actionText = "Ver Reporte",
                    targetTab = "FINANCE"
                )
            )
        }

        return list.sortedBy { it.priority.ordinal }
    }
}
