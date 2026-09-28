package com.example.courier

import com.example.domain.engine.courier.*
import com.example.domain.model.courier.*
import com.example.domain.security.SecurityEnforcementAction
import com.example.domain.security.TrustScoreCalculator
import org.junit.Assert.*
import org.junit.Test

class CourierEngineTest {

    @Test
    fun `test ShiftEngine state transitions`() {
        val shiftEngine = ShiftEngine()

        // 1. Initial state is OFFLINE
        assertEquals(CourierShiftState.OFFLINE, shiftEngine.currentSession.value.currentState)

        // 2. Start shift -> ONLINE
        val started = shiftEngine.startShift("usr_courier_1", 95, 12500.0)
        assertTrue(started)
        assertEquals(CourierShiftState.ONLINE, shiftEngine.currentSession.value.currentState)

        // 3. Transition to WAITING_ORDER
        val transition1 = shiftEngine.transitionTo(CourierShiftState.WAITING_ORDER)
        assertTrue(transition1)
        assertEquals(CourierShiftState.WAITING_ORDER, shiftEngine.currentSession.value.currentState)

        // 4. Transition to GOING_TO_STORE with orderId
        val transition2 = shiftEngine.transitionTo(CourierShiftState.GOING_TO_STORE, "ord_999")
        assertTrue(transition2)
        assertEquals(CourierShiftState.GOING_TO_STORE, shiftEngine.currentSession.value.currentState)
        assertEquals("ord_999", shiftEngine.currentSession.value.activeOrderId)

        // 5. Invalid transition directly to DELIVERED without intermediate steps
        val invalidTransition = shiftEngine.transitionTo(CourierShiftState.DELIVERED)
        assertFalse(invalidTransition)

        // 6. End shift
        val endedSession = shiftEngine.endShift(12530.0)
        assertEquals(CourierShiftState.OFFLINE, shiftEngine.currentSession.value.currentState)
        assertEquals(12530.0, endedSession.finalOdometerKm!!, 0.01)
    }

    @Test
    fun `test IncidentEngine evidence validation`() {
        val incidentEngine = IncidentEngine()

        // Report incident that requires evidence without photo -> fails
        val resultNoPhoto = incidentEngine.reportIncident(
            courierId = "usr_123",
            incidentType = CourierIncidentType.COMERCIO_CERRADO,
            description = "Tienda cerrada",
            photoEvidenceUrl = null
        )
        assertTrue(resultNoPhoto.isFailure)

        // Report incident with photo evidence -> succeeds
        val resultWithPhoto = incidentEngine.reportIncident(
            courierId = "usr_123",
            incidentType = CourierIncidentType.COMERCIO_CERRADO,
            description = "Tienda cerrada con persiana abajo",
            photoEvidenceUrl = "https://storage.example.com/evidence1.jpg"
        )
        assertTrue(resultWithPhoto.isSuccess)
    }

    @Test
    fun `test ProofOfDeliveryEngine policy validation`() {
        val podEngine = ProofOfDeliveryEngine()

        // Small order policy -> OTP only
        val smallPolicy = DeliveryProofPolicy.resolvePolicy(orderTotal = 100.0, isCorporate = false, isPremiumCustomer = false)
        assertEquals(DeliveryProofType.STANDARD_SMALL, smallPolicy.proofType)

        val bundleCorrectOtp = ProofOfDeliveryBundle(orderId = "ord_1", otpCodeEntered = "4321")
        val validSmall = podEngine.validateProof(smallPolicy, bundleCorrectOtp, expectedOtp = "4321")
        assertTrue(validSmall.getOrDefault(false))

        val bundleWrongOtp = ProofOfDeliveryBundle(orderId = "ord_1", otpCodeEntered = "9999")
        val invalidSmall = podEngine.validateProof(smallPolicy, bundleWrongOtp, expectedOtp = "4321")
        assertTrue(invalidSmall.isFailure)

        // Premium policy -> Photo + Signature + OTP
        val premiumPolicy = DeliveryProofPolicy.resolvePolicy(orderTotal = 600.0, isCorporate = false, isPremiumCustomer = true)
        assertEquals(DeliveryProofType.PREMIUM, premiumPolicy.proofType)

        val bundleMissingSig = ProofOfDeliveryBundle(
            orderId = "ord_2",
            otpCodeEntered = "1234",
            photoStorageUrl = "https://storage.example.com/p.jpg",
            signatureStorageUrl = null
        )
        val invalidPremium = podEngine.validateProof(premiumPolicy, bundleMissingSig, expectedOtp = "1234")
        assertTrue(invalidPremium.isFailure)
    }

    @Test
    fun `test TrustScoreCalculator anti-fraud progressive rules`() {
        // Normal ping -> 100 score, AUDIT_LOG_ONLY
        val assessmentClean = TrustScoreCalculator.evaluateTrust(
            courierId = "c1",
            isMockLocation = false,
            isRooted = false,
            prevLat = 12.13, prevLng = -86.25, prevTimeMs = 1000L,
            currentLat = 12.131, currentLng = -86.251, currentTimeMs = 60000L
        )
        assertEquals(100, assessmentClean.trustScore)
        assertEquals(SecurityEnforcementAction.AUDIT_LOG_ONLY, assessmentClean.recommendedAction)

        // Mock location ping -> score 60, WARNING_ALERT
        val assessmentMock = TrustScoreCalculator.evaluateTrust(
            courierId = "c1",
            isMockLocation = true,
            isRooted = false,
            prevLat = 12.13, prevLng = -86.25, prevTimeMs = 1000L,
            currentLat = 12.131, currentLng = -86.251, currentTimeMs = 60000L,
            anomalyCount = 1
        )
        assertEquals(60, assessmentMock.trustScore)
        assertEquals(SecurityEnforcementAction.WARNING_ALERT, assessmentMock.recommendedAction)

        // High anomaly count -> TEMPORARY_SUSPENSION
        val assessmentSuspended = TrustScoreCalculator.evaluateTrust(
            courierId = "c1",
            isMockLocation = true,
            isRooted = true,
            prevLat = 12.13, prevLng = -86.25, prevTimeMs = 1000L,
            currentLat = 12.50, currentLng = -86.80, currentTimeMs = 2000L, // Impossible velocity jump
            anomalyCount = 2
        )
        assertEquals(15, assessmentSuspended.trustScore)
        assertEquals(SecurityEnforcementAction.TEMPORARY_SUSPENSION, assessmentSuspended.recommendedAction)
    }
}
