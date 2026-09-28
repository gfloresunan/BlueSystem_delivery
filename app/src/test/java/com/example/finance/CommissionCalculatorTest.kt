package com.example.finance

import org.junit.Assert.*
import org.junit.Test

class CommissionCalculatorTest {

    @Test
    fun testCommissionRateFormula() {
        val gross = 2000.0
        val rate = 0.15
        val commission = gross * rate
        assertEquals(300.0, commission, 0.01)
    }
}
