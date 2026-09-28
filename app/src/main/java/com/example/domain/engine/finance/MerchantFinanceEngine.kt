package com.example.domain.engine.finance

import com.example.domain.model.finance.FinancialSummary

/**
 * Motor Centralizado de Cálculos Financieros (MerchantFinanceEngine MFC)
 * Reutilizable al 100% para el Merchant Web Portal (Sprint 16).
 */
object MerchantFinanceEngine {

    fun calculateNetSales(grossSales: Double, commissionRatePercent: Double = 15.0): Double {
        val commission = (grossSales * commissionRatePercent) / 100.0
        return (grossSales - commission).coerceAtLeast(0.0)
    }

    fun calculateEstimatedProfit(
        grossSales: Double,
        commissionAmount: Double,
        promotionsDiscountAmount: Double = 0.0,
        optionalProductCostAmount: Double = 0.0
    ): Double {
        return (grossSales - commissionAmount - promotionsDiscountAmount - optionalProductCostAmount).coerceAtLeast(0.0)
    }

    fun calculateAverageTicket(grossSales: Double, totalOrders: Int): Double {
        if (totalOrders <= 0) return 0.0
        return grossSales / totalOrders
    }
}
