package com.example.domain.model.finance

import com.google.firebase.Timestamp

enum class FinancialEventType(val label: String) {
    ORDER_REVENUE("Ingreso Bruto"),
    PLATFORM_FEE("Comisión BSD"),
    REFUND("Devolución"),
    ADJUSTMENT("Ajuste Contable")
}

enum class FinancialDirection {
    CREDIT,
    DEBIT
}

/**
 * Evento Contable Inmutable (/financial_events) — SSOT Ledger
 * Todos los importes monetarios se manejan en centavos enteros (Long).
 */
data class FinancialEvent(
    val eventId: String = "",
    val businessId: String = "",
    val orderId: String = "",
    val eventType: FinancialEventType = FinancialEventType.ORDER_REVENUE,
    val amountCents: Long = 0L,
    val direction: FinancialDirection = FinancialDirection.CREDIT,
    val currency: String = "NIO",
    val description: String = "",
    val orderTotalCents: Long = 0L,
    val merchantGrossSalesCents: Long = 0L,
    val merchantCommissionAmountCents: Long = 0L,
    val merchantNetPayoutCents: Long = 0L,
    val subtotalCents: Long = 0L,
    val deliveryFeeCents: Long = 0L,
    val tipCents: Long = 0L,
    val discountCents: Long = 0L,
    val paymentMethod: String = "efectivo",
    val paymentStatus: String = "COMPLETED",
    val createdAt: Timestamp? = null,
    val idempotencyKey: String = "",
    val orderCode: String = "",
    val commissionRate: Double = 0.0
) {
    val amountNio: Double get() = amountCents / 100.0
    val orderTotalNio: Double get() = orderTotalCents / 100.0
    val subtotalNio: Double get() = subtotalCents / 100.0
    val discountNio: Double get() = discountCents / 100.0
    val deliveryFeeNio: Double get() = deliveryFeeCents / 100.0
    val tipNio: Double get() = tipCents / 100.0
    val commissionNio: Double get() = merchantCommissionAmountCents / 100.0
    val netPayoutNio: Double get() = merchantNetPayoutCents / 100.0

    val displayOrderCode: String
        get() = if (orderCode.isNotBlank()) orderCode else if (orderId.isNotBlank()) orderId.takeLast(6).uppercase() else "ORD-000000"

    val commissionPercentageText: String
        get() {
            return when {
                commissionRate > 0.0 -> {
                    val pct = commissionRate * 100.0
                    if (pct % 1.0 == 0.0) "${pct.toInt()}%" else String.format(java.util.Locale.US, "%.1f%%", pct)
                }
                merchantGrossSalesCents > 0L && merchantCommissionAmountCents > 0L -> {
                    val pct = (merchantCommissionAmountCents.toDouble() / merchantGrossSalesCents.toDouble()) * 100.0
                    if (pct % 1.0 == 0.0) "${pct.toInt()}%" else String.format(java.util.Locale.US, "%.1f%%", pct)
                }
                else -> "15%"
            }
        }
}
