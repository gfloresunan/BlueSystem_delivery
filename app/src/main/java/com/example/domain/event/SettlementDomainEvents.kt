package com.example.domain.event

/**
 * Eventos de dominio financiero emitidos por el SettlementEngine.
 * Completamente desacoplados de la base de datos de contabilidad (Accounting Engine).
 */
sealed class SettlementDomainEvent {
    abstract val eventId: String
    abstract val courierId: String
    abstract val timestampMs: Long

    data class CashCollected(
        override val eventId: String,
        override val courierId: String,
        val orderId: String,
        val amountCollected: Double,
        val expectedAmount: Double,
        override val timestampMs: Long = System.currentTimeMillis()
    ) : SettlementDomainEvent()

    data class TipReceived(
        override val eventId: String,
        override val courierId: String,
        val orderId: String,
        val tipAmount: Double,
        override val timestampMs: Long = System.currentTimeMillis()
    ) : SettlementDomainEvent()

    data class PenaltyApplied(
        override val eventId: String,
        override val courierId: String,
        val orderId: String?,
        val penaltyAmount: Double,
        val reason: String,
        override val timestampMs: Long = System.currentTimeMillis()
    ) : SettlementDomainEvent()

    data class BonusGranted(
        override val eventId: String,
        override val courierId: String,
        val bonusType: String, // E.g., "SURGE_HOUR", "STREAK_COMPLETED"
        val bonusAmount: Double,
        override val timestampMs: Long = System.currentTimeMillis()
    ) : SettlementDomainEvent()

    data class RefundProcessed(
        override val eventId: String,
        override val courierId: String,
        val orderId: String,
        val refundAmount: Double,
        val reason: String,
        override val timestampMs: Long = System.currentTimeMillis()
    ) : SettlementDomainEvent()
}
