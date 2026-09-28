package com.example.courier

import com.example.domain.engine.courier.MapBudgetManager
import com.example.domain.engine.courier.RouteQualityEngine
import com.example.domain.model.courier.ApiConsumptionReason
import com.example.domain.model.courier.EtaWithConfidence
import com.google.android.gms.maps.model.LatLng
import org.junit.Assert.*
import org.junit.Test

class MapEnterpriseRefinementsTest {

    @Test
    fun `test MapBudgetManager cost accumulation and percentage tracking`() {
        val manager = MapBudgetManager(estimatedCostPerQueryUsd = 0.005)

        // Initial state
        assertEquals(50.00, manager.budgetStatus.value.dailyBudgetUsd, 0.001)
        assertEquals(0.00, manager.budgetStatus.value.accumulatedCostTodayUsd, 0.001)
        assertEquals(0.0, manager.budgetStatus.value.dailyPercentageUsed, 0.001)

        // Record 10 queries ($0.05 USD)
        repeat(10) {
            manager.recordApiQuery(ApiConsumptionReason.ORDER_ACCEPTED, estimatedTimeSavedMinutes = 3.5)
        }

        assertEquals(10, manager.budgetStatus.value.queryCountToday)
        assertEquals(0.05, manager.budgetStatus.value.accumulatedCostTodayUsd, 0.001)
        assertEquals(0.1, manager.budgetStatus.value.dailyPercentageUsed, 0.01) // 0.1% of $50
    }

    @Test
    fun `test RouteQualityEngine versioning and quality score`() {
        val engine = RouteQualityEngine()

        val poly1 = listOf(LatLng(12.13, -86.25), LatLng(12.14, -86.26))
        engine.startRoute("ord_100", poly1, distanceKm = 3.5, durationMin = 10.0)

        // Version 1 check
        assertEquals(1, engine.history.value.versions.size)
        assertEquals(100.0, engine.calculateQualityScore().scorePercentage, 0.01)
        assertTrue(engine.calculateQualityScore().isOptimal)

        // Route recalculation / deviation (Version 2)
        val poly2 = listOf(LatLng(12.13, -86.25), LatLng(12.135, -86.255), LatLng(12.14, -86.26))
        engine.addRouteVersion(poly2, distanceKm = 3.8, durationMin = 12.0, reason = "Desvío por tráfico")

        assertEquals(2, engine.history.value.versions.size)
        val score2 = engine.calculateQualityScore()
        assertEquals(85.0, score2.scorePercentage, 0.01) // 100 - 10 - 5 = 85
        assertTrue(score2.isOptimal)
    }

    @Test
    fun `test EtaWithConfidence calculation`() {
        val etaStable = EtaWithConfidence.calculateConfidence(
            remainingTimeMinutes = 8.0,
            speedVariance = 2.0,
            isGpsStable = true,
            deviationCount = 0
        )
        assertEquals(98.0, etaStable.confidencePercentage, 0.01)

        val etaUnstable = EtaWithConfidence.calculateConfidence(
            remainingTimeMinutes = 8.0,
            speedVariance = 20.0, // High variance -> -15%
            isGpsStable = false, // Unstable -> -20%
            deviationCount = 1   // Deviation -> -5%
        )
        assertEquals(58.0, etaUnstable.confidencePercentage, 0.01)
    }
}
