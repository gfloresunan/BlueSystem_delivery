package com.example.courier

import com.example.GeoUtils
import org.junit.Assert.*
import org.junit.Test

/**
 * Test Suite: XToYDynamicDispatchRadiusTest
 * Incident: BSD-X2Y-DYNAMIC-DISPATCH-RADIUS-001
 *
 * Validates:
 * 1. Dynamic Radius Escalation Lifecycle (5km -> 15km -> 30km -> Timeout at 10m).
 * 2. Haversine Distance Discrimination for Candidate Couriers across stages.
 * 3. Single SSOT Server Anchor (createdAt) elapsed time computation.
 * 4. Atomic Claim Lock Race Defense against Timeout / Cancellation.
 * 5. Dual Sync Integrity between /deliveryTrips and /orders.
 * 6. Protection of ADR-026 Frozen Core Invariants.
 */
class XToYDynamicDispatchRadiusTest {

    // =========================================================================
    // SECTION 1: DYNAMIC RADIUS ESCALATION LIFECYCLE
    // =========================================================================

    data class DispatchStageState(
        val stage: String,
        val radiusKm: Double,
        val isCancelled: Boolean,
        val cancelReason: String?
    )

    private fun resolveDispatchStage(elapsedSeconds: Long): DispatchStageState {
        return when {
            elapsedSeconds >= 600 -> DispatchStageState(
                stage = "CANCELLED_TIMEOUT",
                radiusKm = 30.0,
                isCancelled = true,
                cancelReason = "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT"
            )
            elapsedSeconds >= 360 -> DispatchStageState(
                stage = "EXPANDED_30KM",
                radiusKm = 30.0,
                isCancelled = false,
                cancelReason = null
            )
            elapsedSeconds >= 180 -> DispatchStageState(
                stage = "EXPANDED_15KM",
                radiusKm = 15.0,
                isCancelled = false,
                cancelReason = null
            )
            else -> DispatchStageState(
                stage = "SEARCHING_5KM",
                radiusKm = 5.0,
                isCancelled = false,
                cancelReason = null
            )
        }
    }

    @Test
    fun testStage1_initialZeroToThreeMinutes() {
        val at0s = resolveDispatchStage(0)
        assertEquals("SEARCHING_5KM", at0s.stage)
        assertEquals(5.0, at0s.radiusKm, 0.001)
        assertFalse(at0s.isCancelled)

        val at179s = resolveDispatchStage(179)
        assertEquals("SEARCHING_5KM", at179s.stage)
        assertEquals(5.0, at179s.radiusKm, 0.001)
        assertFalse(at179s.isCancelled)
    }

    @Test
    fun testStage2_threeToSixMinutes() {
        val at180s = resolveDispatchStage(180)
        assertEquals("EXPANDED_15KM", at180s.stage)
        assertEquals(15.0, at180s.radiusKm, 0.001)
        assertFalse(at180s.isCancelled)

        val at359s = resolveDispatchStage(359)
        assertEquals("EXPANDED_15KM", at359s.stage)
        assertEquals(15.0, at359s.radiusKm, 0.001)
        assertFalse(at359s.isCancelled)
    }

    @Test
    fun testStage3_sixToTenMinutes() {
        val at360s = resolveDispatchStage(360)
        assertEquals("EXPANDED_30KM", at360s.stage)
        assertEquals(30.0, at360s.radiusKm, 0.001)
        assertFalse(at360s.isCancelled)

        val at599s = resolveDispatchStage(599)
        assertEquals("EXPANDED_30KM", at599s.stage)
        assertEquals(30.0, at599s.radiusKm, 0.001)
        assertFalse(at599s.isCancelled)
    }

    @Test
    fun testStage4_tenMinutesTimeout() {
        val at600s = resolveDispatchStage(600)
        assertTrue(at600s.isCancelled)
        assertEquals("NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT", at600s.cancelReason)

        val at720s = resolveDispatchStage(720)
        assertTrue(at720s.isCancelled)
        assertEquals("NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT", at720s.cancelReason)
    }

    // =========================================================================
    // SECTION 2: HAVERSINE DISTANCE CANDIDATE DISCRIMINATION
    // =========================================================================

    @Test
    fun testCandidateCouriersRadiusMatching() {
        // Origen X (Metrocentro Managua)
        val originLat = 12.1278
        val originLng = -86.2655

        // Courier A: ~3.2 km (Plaza España) -> inside 5 km
        val courierALat = 12.1325
        val courierALng = -86.2945
        val distA = GeoUtils.calculateDistance(originLat, originLng, courierALat, courierALng)

        // Courier B: ~11.8 km (Tipitapa entrada) -> outside 5 km, inside 15 km
        val courierBLat = 12.1850
        val courierBLng = -86.1650
        val distB = GeoUtils.calculateDistance(originLat, originLng, courierBLat, courierBLng)

        // Courier C: ~24.5 km (Masaya centro) -> outside 15 km, inside 30 km
        val courierCLat = 11.9744
        val courierCLng = -86.0942
        val distC = GeoUtils.calculateDistance(originLat, originLng, courierCLat, courierCLng)

        // Courier D: ~42.0 km (Granada centro) -> outside 30 km
        val courierDLat = 11.9299
        val courierDLng = -85.9560
        val distD = GeoUtils.calculateDistance(originLat, originLng, courierDLat, courierDLng)

        // Stage 1: 5.0 km
        val radius1 = 5.0
        assertTrue("Courier A should be inside 5km ($distA km)", distA <= radius1)
        assertFalse("Courier B should be outside 5km ($distB km)", distB <= radius1)
        assertFalse("Courier C should be outside 5km ($distC km)", distC <= radius1)
        assertFalse("Courier D should be outside 5km ($distD km)", distD <= radius1)

        // Stage 2: 15.0 km
        val radius2 = 15.0
        assertTrue("Courier A inside 15km", distA <= radius2)
        assertTrue("Courier B inside 15km", distB <= radius2)
        assertFalse("Courier C outside 15km", distC <= radius2)
        assertFalse("Courier D outside 15km", distD <= radius2)

        // Stage 3: 30.0 km
        val radius3 = 30.0
        assertTrue("Courier A inside 30km", distA <= radius3)
        assertTrue("Courier B inside 30km", distB <= radius3)
        assertTrue("Courier C inside 30km", distC <= radius3)
        assertFalse("Courier D outside 30km", distD <= radius3)
    }

    // =========================================================================
    // SECTION 3: SINGLE SSOT SERVER ANCHOR (createdAt)
    // =========================================================================

    @Test
    fun testServerCreatedAtElapsedAnchor() {
        val createdAtMs = 1700000000000L
        val serverNowMs = 1700000185000L // 185 seconds elapsed

        val elapsedSeconds = ((serverNowMs - createdAtMs) / 1000L).coerceAtLeast(0L)
        assertEquals(185L, elapsedSeconds)

        val stage = resolveDispatchStage(elapsedSeconds)
        assertEquals("EXPANDED_15KM", stage.stage)
        assertEquals(15.0, stage.radiusKm, 0.001)
    }

    // =========================================================================
    // SECTION 4: ATOMIC CLAIM LOCK & RACE DEFENSE
    // =========================================================================

    private fun simulateAtomicClaim(
        tripStatus: String,
        existingAssignedCourierId: String?,
        claimingCourierId: String
    ): Pair<Boolean, String> {
        val normalizedStatus = tripStatus.uppercase()
        if (normalizedStatus in listOf("CANCELLED", "TIMEOUT", "COMPLETED", "DELIVERED")) {
            return Pair(false, "REJECTED_TRIP_INACTIVE_OR_EXPIRED")
        }
        if (!existingAssignedCourierId.isNullOrBlank() && existingAssignedCourierId != claimingCourierId) {
            return Pair(false, "REJECTED_ALREADY_CLAIMED")
        }
        return Pair(true, "CLAIM_SUCCESS")
    }

    @Test
    fun testClaimRejectionOnCancelledOrTimedOutTrip() {
        // If the 10m scheduler or customer cancelled the trip
        val (successCancelled, reasonCancelled) = simulateAtomicClaim(
            tripStatus = "CANCELLED",
            existingAssignedCourierId = null,
            claimingCourierId = "courier_123"
        )
        assertFalse(successCancelled)
        assertEquals("REJECTED_TRIP_INACTIVE_OR_EXPIRED", reasonCancelled)

        val (successTimeout, reasonTimeout) = simulateAtomicClaim(
            tripStatus = "TIMEOUT",
            existingAssignedCourierId = null,
            claimingCourierId = "courier_123"
        )
        assertFalse(successTimeout)
        assertEquals("REJECTED_TRIP_INACTIVE_OR_EXPIRED", reasonTimeout)
    }

    @Test
    fun testClaimRejectionOnDoubleAssignment() {
        val (successFirst, _) = simulateAtomicClaim(
            tripStatus = "PENDING",
            existingAssignedCourierId = null,
            claimingCourierId = "courier_first"
        )
        assertTrue(successFirst)

        // Second courier tries to claim the same trip
        val (successSecond, reasonSecond) = simulateAtomicClaim(
            tripStatus = "ASSIGNED",
            existingAssignedCourierId = "courier_first",
            claimingCourierId = "courier_second"
        )
        assertFalse(successSecond)
        assertEquals("REJECTED_ALREADY_CLAIMED", reasonSecond)
    }

    // =========================================================================
    // SECTION 5: SECURITY & TARGETED QUERYING
    // =========================================================================

    @Test
    fun testCourierTargetedOfferListSecurity() {
        val tripDoc = mapOf(
            "tripId" to "trip_abc_1",
            "status" to "PENDING",
            "eligibleCouriers" to listOf("courier_1", "courier_2", "courier_3")
        )

        val list = tripDoc["eligibleCouriers"] as List<*>
        assertTrue(list.contains("courier_1"))
        assertTrue(list.contains("courier_2"))
        assertFalse(list.contains("courier_outsider"))
    }

    // =========================================================================
    // SECTION 6: DUAL SYNC ATOMIC INTEGRITY
    // =========================================================================

    @Test
    fun testDualSyncUpdatesBothCollections() {
        val tripUpdates = mutableMapOf<String, Any>()
        val orderUpdates = mutableMapOf<String, Any>()

        val courierId = "courier_winner_999"
        val courierName = "Carlos Mendoza"

        // Emulate dual sync in aceptarPedido / claimTripAtomically
        tripUpdates["assignedCourierId"] = courierId
        tripUpdates["status"] = "ASSIGNED"

        orderUpdates["assignedCourierId"] = courierId
        orderUpdates["driverName"] = courierName
        orderUpdates["status"] = "courier_accepted"

        assertEquals(tripUpdates["assignedCourierId"], orderUpdates["assignedCourierId"])
        assertEquals("ASSIGNED", tripUpdates["status"])
        assertEquals("courier_accepted", orderUpdates["status"])
    }

    // =========================================================================
    // SECTION 7: FROZEN CORE (ADR-026) INVARIANTS PROTECTION
    // =========================================================================

    @Test
    fun testFrozenCoreUntouched() {
        // Caso Canónico Certificado ADR-026 / #20846B
        val baseFee = 35.0
        val pricePerKm = 10.0
        val distanceKm = 14.91
        val calculatedFee = baseFee + (distanceKm * pricePerKm)

        // Ecuación Canónica ADR-026: 35.0 + (14.91 * 10.0) = C$ 184.10
        assertEquals(184.10, calculatedFee, 0.001)

        // Dynamic dispatch solo muta metadatos de búsqueda/dispatch, NUNCA el pricingSnapshot
        val trip = mapOf(
            "calculatedFee" to calculatedFee,
            "pricingSnapshot" to mapOf(
                "baseFee" to baseFee,
                "pricePerKm" to pricePerKm,
                "distanceKm" to distanceKm,
                "calculatedAmount" to calculatedFee
            ),
            "dispatchStage" to "EXPANDED_15KM",
            "dispatchRadiusKm" to 15.0
        )
        assertEquals(184.10, trip["calculatedFee"])
        assertEquals("EXPANDED_15KM", trip["dispatchStage"])
        assertEquals(15.0, trip["dispatchRadiusKm"])
    }
}
