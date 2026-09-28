package com.example.finance

import com.example.domain.engine.finance.SettlementEngine
import org.junit.Assert.*
import org.junit.Test

class SettlementEngineTest {

    @Test
    fun testGenerateSettlementCalculation() {
        val set = SettlementEngine.generateSettlement("Periodo Test", 1000.0, 15.0, 100.0)
        assertEquals(150.0, set.commissionAmount, 0.01)
        assertEquals(950.0, set.netPayoutAmount, 0.01)
    }
}
