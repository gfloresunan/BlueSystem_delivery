package com.example.courier

import com.example.domain.engine.courier.MapIntelligenceEngine
import com.example.domain.model.courier.ApiConsumptionReason
import com.example.domain.model.courier.MapCostOptimizationPolicy
import com.example.domain.model.courier.RouteCacheEntry
import com.google.android.gms.maps.model.LatLng
import org.junit.Assert.*
import org.junit.Test

class MapIntelligenceEngineTest {

    @Test
    fun `test Level 1 local calculations without external API cost`() {
        val engine = MapIntelligenceEngine()

        // 1. Local Haversine Distance
        val distKm = engine.calculateLocalDistanceKm(12.1364, -86.2514, 12.1432, -86.2625)
        assertTrue(distKm > 0.0)

        // 2. Local Geofence
        val isInside = engine.isWithinLocalGeofence(12.1364, -86.2514, 12.13641, -86.25141, 50.0)
        assertTrue(isInside)

        // 3. Local ETA Estimate
        val eta = engine.calculateLocalEta(12.1364, -86.2514, 12.1432, -86.2625, currentSpeedKmh = 35.0)
        assertTrue(eta.remainingTimeMinutes > 0.0)
        assertTrue(eta.isLocallyCalculated)

        // Verify zero external API calls were performed
        assertEquals(0, engine.externalApiCallCount.value)
    }

    @Test
    fun `test Level 2 event trigger policy`() {
        val engine = MapIntelligenceEngine()

        // Explicit event ORDER_ACCEPTED triggers 1 API call
        val allowAccepted = engine.shouldFetchExternalDirections(
            ApiConsumptionReason.ORDER_ACCEPTED,
            12.1364, -86.2514, 12.1432, -86.2625
        )
        assertTrue(allowAccepted)
        assertEquals(1, engine.externalApiCallCount.value)

        // Cache the returned polyline
        val samplePolyline = listOf(
            LatLng(12.1364, -86.2514),
            LatLng(12.1400, -86.2550),
            LatLng(12.1432, -86.2625)
        )
        engine.cacheRoute(
            RouteCacheEntry(
                routeId = "r1",
                originLat = 12.1364, originLng = -86.2514,
                destinationLat = 12.1432, destinationLng = -86.2625,
                polylinePoints = samplePolyline
            )
        )

        // Normal GPS ping along the cached path -> NO API CALL
        val allowNormalPing = engine.shouldFetchExternalDirections(
            ApiConsumptionReason.PATH_DEVIATION_DETECTED,
            12.1400, -86.2550, // On the line
            12.1432, -86.2625
        )
        assertFalse(allowNormalPing)
        assertEquals(1, engine.externalApiCallCount.value) // Counter remains 1

        // Deviation ping (>200m off-route) -> TRIGGERS NEW API CALL
        val allowDeviationPing = engine.shouldFetchExternalDirections(
            ApiConsumptionReason.PATH_DEVIATION_DETECTED,
            12.2000, -86.3500, // Way off route (>200m)
            12.1432, -86.2625
        )
        assertTrue(allowDeviationPing)
        assertEquals(2, engine.externalApiCallCount.value) // Counter incremented to 2
    }

    @Test
    fun `test Level 3 route cache retrieval`() {
        val engine = MapIntelligenceEngine()

        val samplePolyline = listOf(LatLng(12.1364, -86.2514), LatLng(12.1432, -86.2625))
        engine.cacheRoute(
            RouteCacheEntry(
                routeId = "r1",
                originLat = 12.1364, originLng = -86.2514,
                destinationLat = 12.1432, destinationLng = -86.2625,
                polylinePoints = samplePolyline
            )
        )

        // Valid cached polyline
        val cached = engine.getValidCachedPolyline(12.1432, -86.2625)
        assertNotNull(cached)
        assertEquals(2, cached?.size)

        // Destination changed -> Cache invalidated
        val invalidated = engine.getValidCachedPolyline(12.9999, -86.9999)
        assertNull(invalidated)
    }
}
