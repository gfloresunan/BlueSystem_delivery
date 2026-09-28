package com.example.domain.model.finance

import com.google.firebase.Timestamp

/**
 * Máquina de Estados Canónica del Ciclo de Liquidación (Settlement FSM)
 * Protocolo: BSD-FINANCE-MERCHANT-SETTLEMENT-001
 */
enum class SettlementStatus(val label: String) {
    DRAFT("Borrador"),
    PREPARED("Preparada"),
    AWAITING_PAYMENT("En Proceso de Pago"),
    PAID("Pago Registrado"),
    AWAITING_CONFIRMATION("Pago Registrado · Requiere Confirmación"),
    CONFIRMED("Confirmada"),
    CLOSED("Cerrada / Congelada"),
    DISPUTED("En Disputa"),
    UNDER_REVIEW("En Revisión Admin"),
    RESOLVED("Disputa Resuelta")
}

data class ConfirmedByDetails(
    val confirmedAt: Timestamp? = null,
    val confirmedByUid: String = "",
    val confirmedByEmail: String = "",
    val notes: String = ""
)

data class DisputeDetails(
    val disputedAt: Timestamp? = null,
    val disputedByUid: String = "",
    val disputedByEmail: String = "",
    val reason: String = "",
    val claimedDifferenceCents: Long = 0L,
    val description: String = "",
    val evidenceUrl: String? = null,
    val status: String = "OPEN",
    val resolution: String? = null,
    val resolvedByUid: String? = null,
    val resolvedAt: Timestamp? = null
) {
    val claimedDifferenceNio: Double get() = claimedDifferenceCents / 100.0
}

data class SettlementHistoryItem(
    val fromStatus: String = "",
    val toStatus: String = "",
    val actorUid: String = "",
    val actorRole: String = "",
    val actorEmail: String = "",
    val timestamp: Timestamp? = null,
    val note: String = ""
)

/**
 * Liquidación Financiera Canónica (/merchant_settlements/{settlementId})
 * Todos los montos se representan en centavos enteros (Long).
 */
data class MerchantSettlement(
    val settlementId: String = "",
    val businessId: String = "",
    val businessName: String = "",
    val currency: String = "NIO",
    val periodType: String = "CUSTOM",
    val periodStart: Timestamp? = null,
    val periodEnd: Timestamp? = null,
    val cutoffAt: Timestamp? = null,
    val grossSalesCents: Long = 0L,
    val platformFeesCents: Long = 0L,
    val discountsCents: Long = 0L,
    val adjustmentsCents: Long = 0L,
    val netPayableCents: Long = 0L,
    val ordersCount: Int = 0,
    val paidCents: Long? = null,
    val bankName: String? = null,
    val transferReference: String? = null,
    val paymentDate: Timestamp? = null,
    val receiptUrl: String? = null,
    val receiptPath: String? = null,
    val status: SettlementStatus = SettlementStatus.DRAFT,
    val isFrozen: Boolean = false,
    val frozenAt: Timestamp? = null,
    val confirmedBy: ConfirmedByDetails? = null,
    val dispute: DisputeDetails? = null,
    val history: List<SettlementHistoryItem> = emptyList(),
    val createdAt: Timestamp? = null
) {
    val grossSalesNio: Double get() = grossSalesCents / 100.0
    val platformFeesNio: Double get() = platformFeesCents / 100.0
    val discountsNio: Double get() = discountsCents / 100.0
    val adjustmentsNio: Double get() = adjustmentsCents / 100.0
    val netPayableNio: Double get() = netPayableCents / 100.0
    val paidNio: Double? get() = paidCents?.let { it / 100.0 }

    // Compatibilidad con código previo y tests unitarios
    val commissionAmount: Double get() = platformFeesNio
    val netPayoutAmount: Double get() = netPayableNio
    val grossSalesAmount: Double get() = grossSalesNio

    val isAwaitingConfirmation: Boolean
        get() = (status == SettlementStatus.AWAITING_CONFIRMATION || status == SettlementStatus.PAID) && !isFrozen
}

// Alias de compatibilidad para código legacy
typealias CommissionSettlement = MerchantSettlement
