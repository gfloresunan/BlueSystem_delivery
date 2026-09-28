package com.example.domain.model.finance

enum class InsightSeverity {
    POSITIVE,
    WARNING,
    INFO
}

data class FinancialInsight(
    val id: String,
    val title: String,
    val description: String,
    val severity: InsightSeverity = InsightSeverity.POSITIVE
)
