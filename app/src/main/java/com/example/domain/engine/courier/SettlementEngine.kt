package com.example.domain.engine.courier

import com.example.domain.event.SettlementDomainEvent
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.UUID

/**
 * Resumen de balance de caja del motorizado en su turno activo.
 */
data class ShiftCashBalance(
    val courierId: String = "",
    val totalCashCollected: Double = 0.0,
    val totalDeliveryFeesEarned: Double = 0.0,
    val totalTips: Double = 0.0,
    val totalBonuses: Double = 0.0,
    val totalPenalties: Double = 0.0,
    val totalRefunds: Double = 0.0
) {
    /** Saldo neto que el motorizado debe entregar a la caja de la empresa (o recibir) */
    val netBalanceToSettle: Double
        get() = totalCashCollected - (totalDeliveryFeesEarned + totalTips + totalBonuses - totalPenalties - totalRefunds)
}

/**
 * Motor de liquidación financiera y arqueo diario (SettlementEngine).
 * Emite únicamente eventos puros de dominio desacoplados de la contabilidad central.
 */
class SettlementEngine {

    private val _eventStream = MutableSharedFlow<SettlementDomainEvent>(replay = 50)
    val eventStream: SharedFlow<SettlementDomainEvent> = _eventStream.asSharedFlow()

    private var currentBalance = ShiftCashBalance()

    fun initializeSession(courierId: String) {
        currentBalance = ShiftCashBalance(courierId = courierId)
    }

    fun getCurrentBalance(): ShiftCashBalance = currentBalance

    suspend fun recordCashCollected(courierId: String, orderId: String, amountCollected: Double, expectedAmount: Double): SettlementDomainEvent.CashCollected {
        currentBalance = currentBalance.copy(totalCashCollected = currentBalance.totalCashCollected + amountCollected)
        val event = SettlementDomainEvent.CashCollected(
            eventId = UUID.randomUUID().toString(),
            courierId = courierId,
            orderId = orderId,
            amountCollected = amountCollected,
            expectedAmount = expectedAmount
        )
        _eventStream.emit(event)
        return event
    }

    suspend fun recordDeliveryFeeEarned(deliveryFee: Double) {
        currentBalance = currentBalance.copy(totalDeliveryFeesEarned = currentBalance.totalDeliveryFeesEarned + deliveryFee)
    }

    suspend fun recordTipReceived(courierId: String, orderId: String, tipAmount: Double): SettlementDomainEvent.TipReceived {
        currentBalance = currentBalance.copy(totalTips = currentBalance.totalTips + tipAmount)
        val event = SettlementDomainEvent.TipReceived(
            eventId = UUID.randomUUID().toString(),
            courierId = courierId,
            orderId = orderId,
            tipAmount = tipAmount
        )
        _eventStream.emit(event)
        return event
    }

    suspend fun recordBonusGranted(courierId: String, bonusType: String, bonusAmount: Double): SettlementDomainEvent.BonusGranted {
        currentBalance = currentBalance.copy(totalBonuses = currentBalance.totalBonuses + bonusAmount)
        val event = SettlementDomainEvent.BonusGranted(
            eventId = UUID.randomUUID().toString(),
            courierId = courierId,
            bonusType = bonusType,
            bonusAmount = bonusAmount
        )
        _eventStream.emit(event)
        return event
    }

    suspend fun recordPenaltyApplied(courierId: String, orderId: String?, penaltyAmount: Double, reason: String): SettlementDomainEvent.PenaltyApplied {
        currentBalance = currentBalance.copy(totalPenalties = currentBalance.totalPenalties + penaltyAmount)
        val event = SettlementDomainEvent.PenaltyApplied(
            eventId = UUID.randomUUID().toString(),
            courierId = courierId,
            orderId = orderId,
            penaltyAmount = penaltyAmount,
            reason = reason
        )
        _eventStream.emit(event)
        return event
    }
}
