package com.example.finance

import com.example.domain.engine.finance.MerchantFinanceEngine
import org.junit.Assert.*
import org.junit.Test

class FinancialKpiCalculatorTest {

    @Test
    fun testAverageTicketCalculation() {
        val avg = MerchantFinanceEngine.calculateAverageTicket(1500.0, 5)
        assertEquals(300.0, avg, 0.01)
    }
}
