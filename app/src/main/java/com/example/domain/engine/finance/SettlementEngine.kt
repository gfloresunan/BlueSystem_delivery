package com.example.domain.engine.finance

import com.example.domain.model.finance.MerchantSettlement
import com.example.domain.model.finance.SettlementStatus

/**
 * Motor de Liquidación y Estados de Cuenta (SettlementEngine MFC)
 */
object SettlementEngine {

    fun generateSettlement(
        periodLabel: String,
        grossSales: Double,
        commissionPercent: Double = 15.0,
        tips: Double = 0.0
    ): MerchantSettlement {
        val grossSalesCents = Math.round(grossSales * 100)
        val commissionCents = Math.round((grossSalesCents * commissionPercent) / 100.0)
        val netPayableCents = Math.max(0L, grossSalesCents - commissionCents + Math.round(tips * 100))

        return MerchantSettlement(
            settlementId = "set_${System.currentTimeMillis()}",
            periodType = periodLabel,
            grossSalesCents = grossSalesCents,
            platformFeesCents = commissionCents,
            netPayableCents = netPayableCents,
            status = SettlementStatus.PAID
        )
    }
}
