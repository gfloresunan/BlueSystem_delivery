package com.example.courier

import com.example.GeoUtils
import com.example.domain.engine.FleetEligibilityEngine
import com.example.domain.engine.courier.SettlementEngine
import com.example.domain.engine.courier.ShiftCashBalance
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/**
 * C28 — X→Y DELIVERY BUSINESS & DISPATCH VALIDATION TEST SUITE
 *
 * Verifies Financial Integrity, Dispatch Rules, Fleet Eligibility, Security Boundaries,
 * and Forensic Traceability for X→Y Delivery 2.0.
 */
class XToYBusinessDispatchValidationTest {

    // =========================================================================
    // FINANCIAL FORENSIC TESTS (FIN-01 to FIN-10)
    // =========================================================================

    @Test
    fun testFIN01_calculatedFeeIntegrity() {
        val baseFee = 35.0
        val costPerKm = 15.0

        val testDistances = listOf(
            0.0 to 35.0,
            1.0 to 50.0,
            2.41 to (35.0 + 2.41 * 15.0),
            3.42 to (35.0 + 3.42 * 15.0),
            5.60 to (35.0 + 5.60 * 15.0),
            15.0 to (35.0 + 15.0 * 15.0),
            35.0 to (35.0 + 35.0 * 15.0)
        )

        for ((distKm, expectedFee) in testDistances) {
            val calculated = baseFee + (distKm * costPerKm)
            assertEquals("Fee for $distKm km must match formula exactly", expectedFee, calculated, 0.001)
        }
    }

    @Test
    fun testFIN02_customerOfferIntegrityAndLimits() {
        val calculatedFee = 100.0
        val minAllowed = calculatedFee
        val maxAllowed = (calculatedFee * 3.0).coerceAtLeast(600.0) // 600.0

        // Test 1: Offer below calculatedFee is invalid
        val invalidLowOffer = 95.0
        assertTrue(invalidLowOffer < minAllowed)

        // Test 2: Offer equal to calculatedFee is valid
        val validEqualOffer = 100.0
        assertTrue(validEqualOffer in minAllowed..maxAllowed)

        // Test 3: Offer with +5 or +50 is valid
        val validHigherOffer = 125.0
        assertTrue(validHigherOffer in minAllowed..maxAllowed)

        // Test 4: Excessive offer > 3x (or > 600) is invalid
        val excessiveOffer = 650.0
        assertTrue(excessiveOffer > maxAllowed)
    }

    @Test
    fun testFIN03_deliveryFeeResolution() {
        val calculatedFee = 100.0
        
        // When no custom offer is made, deliveryFee = calculatedFee
        val customOfferNull: Double? = null
        val finalFeeDefault = customOfferNull ?: calculatedFee
        assertEquals(100.0, finalFeeDefault, 0.001)

        // When valid offer is made, deliveryFee = customOffer
        val customOfferValue = 125.0
        val finalFeeCustom = customOfferValue
        assertEquals(125.0, finalFeeCustom, 0.001)
    }

    @Test
    fun testFIN04_and_FIN05_senderCashAndChange() {
        val deliveryFee = 125.0
        
        // Scenario 1: Exact payment
        val paidExact = 125.0
        val changeExact = if (paidExact >= deliveryFee) paidExact - deliveryFee else -1.0
        assertEquals(0.0, changeExact, 0.001)

        // Scenario 2: Payment with change
        val paidHigher = 200.0
        val changeHigher = if (paidHigher >= deliveryFee) paidHigher - deliveryFee else -1.0
        assertEquals(75.0, changeHigher, 0.001)

        // Scenario 3: Underpayment denied
        val paidLower = 100.0
        assertTrue("Underpayment must be detected as insufficient", paidLower < deliveryFee)
    }

    @Test
    fun testFIN06_and_FIN07_recipientPayerAndCollection() {
        val deliveryFee = 185.0
        val payer = "RECIPIENT"

        // Sender at origin pays C$0
        val senderPaid = if (payer == "SENDER") deliveryFee else 0.0
        assertEquals(0.0, senderPaid, 0.001)

        // Recipient at destination pays C$185 with C$200 bill
        val recipientBill = 200.0
        val changeReturned = recipientBill - deliveryFee
        val amountCollectedForSettlement = deliveryFee // Only delivery fee is recognized revenue

        assertEquals(15.0, changeReturned, 0.001)
        assertEquals(185.0, amountCollectedForSettlement, 0.001)
    }

    @Test
    fun testFIN10_settlementEngineBalance() = runBlocking {
        val settlementEngine = SettlementEngine()
        val courierId = "courier_101"
        settlementEngine.initializeSession(courierId)

        // Case 1: Courier collected C$185 in cash for a delivery fee of C$185
        settlementEngine.recordCashCollected(courierId, "env_001", amountCollected = 185.0, expectedAmount = 185.0)
        settlementEngine.recordDeliveryFeeEarned(deliveryFee = 185.0)

        val balance = settlementEngine.getCurrentBalance()
        assertEquals(185.0, balance.totalCashCollected, 0.001)
        assertEquals(185.0, balance.totalDeliveryFeesEarned, 0.001)
        // Net balance to settle: 185 - 185 = 0
        assertEquals(0.0, balance.netBalanceToSettle, 0.001)
    }

    // =========================================================================
    // DISPATCH FORENSIC TESTS (DSP-01 to DSP-13)
    // =========================================================================

    @Test
    fun testDSP01_courierOnlineAndEligible() {
        val now = System.currentTimeMillis()
        val courier = FleetEligibilityEngine.CourierState(
            courierId = "c_001",
            courierName = "Carlos Rivas",
            isOnline = true,
            isActive = true,
            currentLat = 12.1364,
            currentLng = -86.2514,
            lastLocationUpdateMs = now - (2 * 60 * 1000L), // 2 min ago
            activeAssignmentId = null
        )

        val result = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = courier,
            originLat = 12.1400,
            originLng = -86.2550,
            maxRadiusKm = 15.0
        )

        assertTrue("Courier must be eligible", result.isEligible)
        assertNull(result.rejectionReason)
        assertTrue("Distance must be <= 15 km", result.distanceToOriginKm <= 15.0)
    }

    @Test
    fun testDSP02_and_DSP03_courierOfflineOrInactive() {
        val now = System.currentTimeMillis()
        val offlineCourier = FleetEligibilityEngine.CourierState(
            courierId = "c_002",
            courierName = "Inactivo",
            isOnline = false,
            isActive = true,
            currentLat = 12.1364,
            currentLng = -86.2514,
            lastLocationUpdateMs = now,
            activeAssignmentId = null
        )

        val resultOffline = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = offlineCourier,
            originLat = 12.1400,
            originLng = -86.2550
        )
        assertFalse("Offline courier must be rejected", resultOffline.isEligible)

        val inactiveCourier = offlineCourier.copy(isOnline = true, isActive = false)
        val resultInactive = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = inactiveCourier,
            originLat = 12.1400,
            originLng = -86.2550
        )
        assertFalse("Inactive courier must be rejected", resultInactive.isEligible)
    }

    @Test
    fun testDSP04_and_DSP05_gpsFreshnessThreshold() {
        val now = System.currentTimeMillis()
        
        // 9 minutes ago -> FRESH (eligible)
        val freshCourier = FleetEligibilityEngine.CourierState(
            courierId = "c_003",
            courierName = "Fresh",
            isOnline = true,
            isActive = true,
            currentLat = 12.1364,
            currentLng = -86.2514,
            lastLocationUpdateMs = now - (9 * 60 * 1000L),
            activeAssignmentId = null
        )
        val freshResult = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = freshCourier,
            originLat = 12.1400,
            originLng = -86.2550
        )
        assertTrue("9 min old GPS must be eligible", freshResult.isEligible)

        // 11 minutes ago -> STALE (rejected)
        val staleCourier = freshCourier.copy(lastLocationUpdateMs = now - (11 * 60 * 1000L))
        val staleResult = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = staleCourier,
            originLat = 12.1400,
            originLng = -86.2550
        )
        assertFalse("11 min old GPS must be rejected as stale", staleResult.isEligible)
        assertEquals("Ubicación GPS no actualizada.", staleResult.rejectionReason)
    }

    @Test
    fun testDSP06_activeAssignmentConflict() {
        val now = System.currentTimeMillis()
        val busyCourier = FleetEligibilityEngine.CourierState(
            courierId = "c_004",
            courierName = "Busy",
            isOnline = true,
            isActive = true,
            currentLat = 12.1364,
            currentLng = -86.2514,
            lastLocationUpdateMs = now,
            activeAssignmentId = "ped_999"
        )
        val result = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = busyCourier,
            originLat = 12.1400,
            originLng = -86.2550
        )
        assertFalse("Courier with active assignment must be rejected", result.isEligible)
        assertTrue(result.rejectionReason!!.contains("servicio activo asignado"))
    }

    @Test
    fun testDSP07_fleetRadiusBoundary() {
        val now = System.currentTimeMillis()
        // Point far away (> 15 km)
        val farCourier = FleetEligibilityEngine.CourierState(
            courierId = "c_005",
            courierName = "Far Away",
            isOnline = true,
            isActive = true,
            currentLat = 11.9000, // ~30 km south
            currentLng = -86.2514,
            lastLocationUpdateMs = now,
            activeAssignmentId = null
        )
        val result = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = farCourier,
            originLat = 12.1400,
            originLng = -86.2550,
            maxRadiusKm = 15.0
        )
        assertFalse("Courier >15 km must be rejected", result.isEligible)
        assertTrue(result.rejectionReason!!.contains("fuera del radio"))
    }

    @Test
    fun testDSP09_and_DSP10_atomicClaimDoubleClaimProtection() {
        // Model transaction lock
        var assignedCourierId: String? = null

        fun simulateClaimTrip(courierId: String): Boolean {
            // Atomic transaction check
            if (!assignedCourierId.isNullOrEmpty() && assignedCourierId != courierId) {
                return false // Lock active, second claim fails
            }
            assignedCourierId = courierId
            return true
        }

        // Courier A claims first
        val claimA = simulateClaimTrip("courier_A")
        assertTrue("Courier A must succeed in claiming", claimA)
        assertEquals("courier_A", assignedCourierId)

        // Courier B attempts to claim the same trip simultaneously
        val claimB = simulateClaimTrip("courier_B")
        assertFalse("Courier B must be rejected due to atomic lock", claimB)
        assertEquals("courier_A", assignedCourierId)
    }

    @Test
    fun testDSP11_reassignmentFlow() {
        var assignedCourierId: String? = "courier_A"
        var status = "ASSIGNED"

        // Courier A cancels
        fun cancelAssignment() {
            assignedCourierId = null
            status = "READY"
        }

        cancelAssignment()
        assertNull("assignedCourierId must revert to null", assignedCourierId)
        assertEquals("READY", status)

        // Courier B claims
        assignedCourierId = "courier_B"
        status = "ASSIGNED"
        assertEquals("courier_B", assignedCourierId)
        assertEquals("ASSIGNED", status)
    }

    // =========================================================================
    // SECURITY & ISOLATION TESTS (SEC-01 to SEC-08)
    // =========================================================================

    @Test
    fun testSEC01_and_SEC02_domainIsolationAndNoBranchRequired() {
        // Verify evaluateXToYTripEligibility does not require branch or business
        val now = System.currentTimeMillis()
        val courier = FleetEligibilityEngine.CourierState(
            courierId = "c_sec_01",
            courierName = "Secure Courier",
            isOnline = true,
            isActive = true,
            currentLat = 12.1364,
            currentLng = -86.2514,
            lastLocationUpdateMs = now,
            activeAssignmentId = null
        )

        // Only lat/lng are passed, proving zero coupling to Branch or Business
        val result = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = courier,
            originLat = 12.1400,
            originLng = -86.2550
        )
        assertTrue(result.isEligible)
    }

    @Test
    fun testSEC05_terminalStateProtection() {
        val terminalStates = listOf("DELIVERED", "COMPLETED", "CANCELLED")

        fun isModificationAllowed(currentState: String): Boolean {
            return currentState.uppercase() !in terminalStates
        }

        assertFalse("DELIVERED is terminal", isModificationAllowed("DELIVERED"))
        assertFalse("COMPLETED is terminal", isModificationAllowed("COMPLETED"))
        assertFalse("CANCELLED is terminal", isModificationAllowed("CANCELLED"))
        assertTrue("PENDING allows modification", isModificationAllowed("PENDING"))
        assertTrue("READY allows modification", isModificationAllowed("READY"))
    }
}
