package com.example.domain.model.finance

/**
 * Filtro Temporal para el Merchant Finance Center (MFC)
 */
enum class FinancialFilter(val label: String) {
    TODAY("Hoy"),
    YESTERDAY("Ayer"),
    THIS_WEEK("Esta Semana"),
    THIS_MONTH("Este Mes"),
    LAST_30_DAYS("Últimos 30 Días"),
    CUSTOM_RANGE("Rango Personalizado")
}
