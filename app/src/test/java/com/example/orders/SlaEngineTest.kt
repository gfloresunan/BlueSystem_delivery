package com.example.orders

import com.example.domain.engine.orders.SlaEngine
import com.example.domain.model.orders.SlaStatus
import org.junit.Assert.*
import org.junit.Test

class SlaEngineTest {

    @Test
    fun testSlaStatusCalculation() {
        val normal = SlaEngine.calculateSlaStatus(10, 20)
        assertEquals(SlaStatus.NORMAL, normal)

        val warning = SlaEngine.calculateSlaStatus(22, 20)
        assertEquals(SlaStatus.WARNING, warning)

        val critical = SlaEngine.calculateSlaStatus(30, 20)
        assertEquals(SlaStatus.CRITICAL, critical)

        val breached = SlaEngine.calculateSlaStatus(45, 20)
        assertEquals(SlaStatus.BREACHED, breached)
    }
}
