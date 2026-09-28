package com.example.controltower

import com.example.domain.engine.controltower.ControlTowerSmartAssignmentEngine
import com.example.domain.model.controltower.FleetCourier
import com.example.domain.model.controltower.FleetCourierStatus
import org.junit.Assert.*
import org.junit.Test

class SmartAssignmentEngineTest {

    @Test
    fun testSuggestBestCourierSelection() {
        val list = listOf(
            FleetCourier("c1", "Luis", distanceKm = 4.5, rating = 4.2),
            FleetCourier("c2", "Carlos", distanceKm = 0.5, rating = 4.9)
        )

        val best = ControlTowerSmartAssignmentEngine.suggestBestCourier(list)
        assertNotNull(best)
        assertEquals("c2", best?.courierId)
    }
}
