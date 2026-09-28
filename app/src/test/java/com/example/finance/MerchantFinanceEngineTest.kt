package com.example.finance

import com.example.domain.engine.finance.MerchantFinanceEngine
import org.junit.Assert.*
import org.junit.Test

class MerchantFinanceEngineTest {

    @Test
    fun testNetSalesAndProfitCalculation() {
        val gross = 1000.0
        val net = MerchantFinanceEngine.calculateNetSales(gross, 15.0)
        assertEquals(850.0, net, 0.01)

        val profit = MerchantFinanceEngine.calculateEstimatedProfit(grossSales = gross, commissionAmount = 150.0)
        assertEquals(850.0, profit, 0.01)
    }
}
