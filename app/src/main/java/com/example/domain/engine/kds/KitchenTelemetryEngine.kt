package com.example.domain.engine.kds

data class KitchenMetricsSummary(
    val averageTicketTimeMs: Long = 0L,
    val totalTicketsProcessed: Int = 0,
    val openTicketsCount: Int = 0,
    val slaCompliancePercentage: Double = 100.0,
    val ordersPerHour: Double = 0.0
)

/**
 * Servidor de Dominio: KitchenTelemetryEngine (Hito 14)
 * Registra indicadores de rendimiento operacionales de cocina (KPIs):
 * Tiempo promedio de ticket, preparaciones, cola activa, tickets abiertos/cerrados y cumplimiento SLA.
 */
class KitchenTelemetryEngine {

    private val ticketsHistory = mutableListOf<KdsTicket>()

    fun recordCompletedTicket(ticket: KdsTicket) {
        ticketsHistory.add(ticket)
    }

    fun calculateSummaryMetrics(currentQueue: List<KdsTicket>): KitchenMetricsSummary {
        val completed = ticketsHistory.filter { it.completedAt != null && it.startedAt != null }
        if (completed.isEmpty()) {
            return KitchenMetricsSummary(openTicketsCount = currentQueue.size)
        }

        val totalDurationMs = completed.sumOf { (it.completedAt ?: 0L) - (it.startedAt ?: 0L) }
        val avgDuration = totalDurationMs / completed.size

        val slaCompliant = completed.count { (it.completedAt ?: 0L) - (it.enqueuedAt) <= 20 * 60 * 1000L }
        val slaPercentage = (slaCompliant.toDouble() / completed.size.toDouble()) * 100.0

        return KitchenMetricsSummary(
            averageTicketTimeMs = avgDuration,
            totalTicketsProcessed = completed.size,
            openTicketsCount = currentQueue.size,
            slaCompliancePercentage = slaPercentage,
            ordersPerHour = (completed.size * 60.0) / 60.0
        )
    }
}
