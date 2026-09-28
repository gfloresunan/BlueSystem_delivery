package com.example.domain.event

import com.example.domain.model.courier.CourierIncidentType
import com.example.domain.model.courier.DeliveryProofType
import com.example.domain.model.courier.PauseReason
import com.google.android.gms.maps.model.LatLng
import java.util.UUID

/**
 * Contrato Unificado de Eventos de Dominio Enterprise para el Módulo Motorizado.
 */
sealed class CourierDomainEvent {
    val eventId: String = UUID.randomUUID().toString()
    val timestampMs: Long = System.currentTimeMillis()

    data class ShiftStarted(
        val courierId: String,
        val initialBatteryLevel: Int,
        val initialOdometerKm: Double
    ) : CourierDomainEvent()

    data class ShiftPaused(
        val courierId: String,
        val reason: PauseReason
    ) : CourierDomainEvent()

    data class IncidentReported(
        val courierId: String,
        val incidentId: String,
        val incidentType: CourierIncidentType,
        val description: String,
        val orderId: String? = null
    ) : CourierDomainEvent()

    data class VehicleUpdated(
        val courierId: String,
        val licensePlate: String,
        val updatedOdometerKm: Double,
        val fuelLitersAdded: Double = 0.0
    ) : CourierDomainEvent()

    data class ProofValidated(
        val courierId: String,
        val orderId: String,
        val proofType: DeliveryProofType,
        val isSuccess: Boolean
    ) : CourierDomainEvent()

    data class RouteCalculated(
        val courierId: String,
        val orderId: String,
        val distanceKm: Double,
        val durationMinutes: Double,
        val polylinePoints: List<LatLng>
    ) : CourierDomainEvent()

    data class RouteDeviationDetected(
        val courierId: String,
        val orderId: String,
        val deviationMeters: Double,
        val currentLat: Double,
        val currentLng: Double
    ) : CourierDomainEvent()

    data class TrustScoreChanged(
        val courierId: String,
        val oldScore: Double,
        val newScore: Double,
        val reason: String
    ) : CourierDomainEvent()

    data class RewardGranted(
        val courierId: String,
        val missionId: String,
        val bonusRewardAmount: Double
    ) : CourierDomainEvent()

    data class SettlementClosed(
        val courierId: String,
        val totalCashCollected: Double,
        val totalTipsEarned: Double,
        val netBalanceToHandOver: Double
    ) : CourierDomainEvent()
}
