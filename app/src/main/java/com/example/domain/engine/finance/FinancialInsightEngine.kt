package com.example.domain.engine.finance

import com.example.domain.model.finance.FinancialInsight
import com.example.domain.model.finance.FinancialSummary
import com.example.domain.model.finance.InsightSeverity

/**
 * Motor de Reglas Deterministas de Insights Financieros (FinancialInsightEngine MFC)
 */
object FinancialInsightEngine {

    fun generateInsights(summary: FinancialSummary): List<FinancialInsight> {
        val list = mutableListOf<FinancialInsight>()

        if (summary.grossSales > 10000) {
            list.add(
                FinancialInsight(
                    id = "ins_sales_high",
                    title = "Ventas en Crecimiento 📈",
                    description = "Tus ventas brutas alcanzaron C$ ${summary.grossSales.toInt()}, superando el promedio proyectado.",
                    severity = InsightSeverity.POSITIVE
                )
            )
        }

        if (summary.averageTicketAmount > 300) {
            list.add(
                FinancialInsight(
                    id = "ins_ticket_good",
                    title = "Ticket Promedio Saludable 🧾",
                    description = "El ticket promedio se mantiene fuerte en C$ ${summary.averageTicketAmount.toInt()}.",
                    severity = InsightSeverity.POSITIVE
                )
            )
        } else {
            list.add(
                FinancialInsight(
                    id = "ins_ticket_low",
                    title = "Ticket Promedio Bajo ⚠️",
                    description = "Se recomienda sugerir combos o bebidas adicionales para elevar el ticket promedio.",
                    severity = InsightSeverity.WARNING
                )
            )
        }

        return list
    }
}
