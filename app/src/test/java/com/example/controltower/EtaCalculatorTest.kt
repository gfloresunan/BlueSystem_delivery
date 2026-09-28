package com.example.controltower

import com.example.domain.engine.controltower.ControlTowerEtaEngine
import org.junit.Assert.*
import org.junit.Test

class EtaCalculatorTest {

    @Test
    fun testEtaBreakdownCalculation() {
        val eta = ControlTowerEtaEngine.calculateEtaBreakdown(kitchenPrepMin = 15, distanceKm = 2.0)
        assertEquals(15, eta.kitchenPrepMinutes)
        assertEquals(3, eta.dispatchMinutes)
        assertEquals(8, eta.travelMinutes)
        assertEquals(26, eta.totalEtaMinutes)
    }
}
