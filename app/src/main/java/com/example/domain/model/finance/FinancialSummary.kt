package com.example.domain.model.finance

import com.google.firebase.Timestamp

/**
 * Resumen Financiero Agregado (/merchant_summaries/{businessId})
 * Representación canónica en centavos enteros (Long) para consistencia aritmética estricta.
 */
data class FinancialSummary(
    val businessId: String = "",
    val revenueCents: Long = 0L,
    val ordersCount: Int = 0,
    val platformFeesCents: Long = 0L,
    val netRevenueCents: Long = 0L,
    val pendingSettlementCents: Long = 0L,
    val lastUpdatedAt: Timestamp? = null,
    val lastOrderId: String? = null,
    val currencySymbol: String = "C$",
    private val explicitAverageTicket: Double? = null
) {
    // Conversión a Córdobas (NIO) exclusivamente para presentación visual
    val revenueNio: Double get() = revenueCents / 100.0
    val platformFeesNio: Double get() = platformFeesCents / 100.0
    val netRevenueNio: Double get() = netRevenueCents / 100.0
    val pendingSettlementNio: Double get() = pendingSettlementCents / 100.0

    val averageTicketCents: Long
        get() = if (ordersCount > 0) revenueCents / ordersCount else ((explicitAverageTicket ?: 0.0) * 100).toLong()

    val averageTicketNio: Double
        get() = if (explicitAverageTicket != null && explicitAverageTicket > 0.0) explicitAverageTicket else (if (ordersCount > 0) averageTicketCents / 100.0 else 0.0)

    // Propiedades de compatibilidad con pantallas y exportadores existentes
    val grossSales: Double get() = revenueNio
    val netSales: Double get() = netRevenueNio
    val totalOrdersCount: Int get() = ordersCount
    val averageTicketAmount: Double get() = averageTicketNio
    val blueSystemCommissionAmount: Double get() = platformFeesNio
    val estimatedProfitAmount: Double get() = netRevenueNio
    val totalTipsAmount: Double get() = 0.0
    val highestTicketAmount: Double get() = 0.0
    val lowestTicketAmount: Double get() = 0.0

    constructor(
        grossSales: Double = 0.0,
        averageTicketAmount: Double = 0.0,
        blueSystemCommissionAmount: Double = 0.0,
        estimatedProfitAmount: Double = 0.0,
        totalOrdersCount: Int = 0,
        businessId: String = ""
    ) : this(
        businessId = businessId,
        revenueCents = Math.round(grossSales * 100),
        ordersCount = totalOrdersCount,
        platformFeesCents = Math.round(blueSystemCommissionAmount * 100),
        netRevenueCents = Math.round(estimatedProfitAmount * 100),
        explicitAverageTicket = if (averageTicketAmount > 0.0) averageTicketAmount else null
    )
}
