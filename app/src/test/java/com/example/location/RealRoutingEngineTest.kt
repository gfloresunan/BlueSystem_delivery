package com.example.location

import com.example.GeoUtils
import com.example.RouteSnapshot
import com.example.domain.engine.RealRoutingEngine
import org.junit.Assert.*
import org.junit.Test

class RealRoutingEngineTest {

    @Test
    fun testAuthoritativeFeeCalculation() {
        // C$35.00 base + C$15.00/km
        assertEquals(35.0, RealRoutingEngine.calculateAuthoritativeFee(0.0), 0.001)
        assertEquals(50.0, RealRoutingEngine.calculateAuthoritativeFee(1.0), 0.001)
        assertEquals(72.50, RealRoutingEngine.calculateAuthoritativeFee(2.5), 0.001)
        assertEquals(110.0, RealRoutingEngine.calculateAuthoritativeFee(5.0), 0.001)
        assertEquals(308.0, RealRoutingEngine.calculateAuthoritativeFee(18.2), 0.001)
    }

    @Test
    fun testAuthoritativeFeeFromMeters() {
        assertEquals(35.0, RealRoutingEngine.calculateAuthoritativeFeeFromMeters(0L), 0.001)
        assertEquals(50.0, RealRoutingEngine.calculateAuthoritativeFeeFromMeters(1000L), 0.001)
        assertEquals(308.60, RealRoutingEngine.calculateAuthoritativeFeeFromMeters(18237L), 0.01)
    }

    @Test
    fun testEstimatedRoadDistanceTortuosity() {
        val metrocentroLat = 12.1285
        val metrocentroLng = -86.2655
        val multicentroLat = 12.1432
        val multicentroLng = -86.2234

        val straightLineKm = GeoUtils.calculateDistance(metrocentroLat, metrocentroLng, multicentroLat, multicentroLng)
        val roadDistanceMeters = RealRoutingEngine.calculateEstimatedRoadDistanceMeters(
            metrocentroLat, metrocentroLng, multicentroLat, multicentroLng
        )
        val roadDistanceKm = roadDistanceMeters / 1000.0

        assertTrue("La distancia vial debe ser mayor a la distancia lineal", roadDistanceKm > straightLineKm)
        val ratio = roadDistanceKm / straightLineKm
        assertEquals(1.28, ratio, 0.02)
    }

    @Test
    fun testFallbackSnapshotGeneration() {
        val snapshot = RealRoutingEngine.createFallbackSnapshot(
            12.1285, -86.2655,
            12.1432, -86.2234
        )

        assertTrue(snapshot.isFallback)
        assertEquals("FALLBACK_ESTIMATED", snapshot.routingProvider)
        assertEquals("v1.0", snapshot.routingVersion)
        assertTrue(snapshot.routeDistanceMeters > 0)
        assertTrue(snapshot.routeDurationSeconds > 0)
        assertTrue(snapshot.straightLineDistanceMeters > 0)
        assertTrue(snapshot.routeDistanceMeters > snapshot.straightLineDistanceMeters)
    }

    @Test
    fun testNicaraguaGeographicFixtures() {
        // GEO-01: Metrocentro -> Multicentro
        val geo01 = RealRoutingEngine.createFallbackSnapshot(12.1285, -86.2655, 12.1432, -86.2234)
        assertTrue(geo01.distanceKm in 5.5..7.5)

        // GEO-02: Plaza Inter -> Ciudad Sandino
        val geo02 = RealRoutingEngine.createFallbackSnapshot(12.1432, -86.2725, 12.1580, -86.3440)
        assertTrue(geo02.distanceKm in 9.5..12.0)

        // GEO-03: Jean Paul Genie -> Masaya
        val geo03 = RealRoutingEngine.createFallbackSnapshot(12.1080, -86.2550, 11.9744, -86.0942)
        assertTrue(geo03.distanceKm in 25.0..32.0)

        // GEO-04: Montoya -> Puerto Salvador Allende
        val geo04 = RealRoutingEngine.createFallbackSnapshot(12.1410, -86.2870, 12.1610, -86.2750)
        assertTrue(geo04.distanceKm in 3.0..4.5)

        // GEO-05: Linda Vista -> Galerías Santo Domingo
        val geo05 = RealRoutingEngine.createFallbackSnapshot(12.1490, -86.3020, 12.1060, -86.2480)
        assertTrue(geo05.distanceKm in 9.0..13.0)
    }

    @Test
    fun testRouteSnapshotDataModel() {
        val snapshot = RouteSnapshot(
            routeDistanceMeters = 18237L,
            routeDurationSeconds = 1440L,
            straightLineDistanceMeters = 14020L,
            routingProvider = "GOOGLE_ROUTES_V2",
            routingVersion = "v1.0",
            transportProfile = "TWO_WHEELER",
            isFallback = false,
            polyline = "encoded_polyline_sample",
            calculatedAt = "2026-08-27T14:30:00Z"
        )

        assertEquals(18.24, snapshot.distanceKm, 0.001)
        assertEquals(24, snapshot.durationMinutes)
        assertEquals("GOOGLE_ROUTES_V2", snapshot.routingProvider)
        assertFalse(snapshot.isFallback)
    }
}
