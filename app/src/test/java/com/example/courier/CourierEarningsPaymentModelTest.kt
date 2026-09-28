package com.example.courier

import com.example.FinanceDateFilter
import com.example.PedidoOfrecido
import com.example.domain.engine.courier.CourierFinanceCalculator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Suite de Pruebas Unitarias Android: BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001
 * Valida que el motor Kotlin [CourierFinanceCalculator] replique la misma verdad contable (SSOT).
 */
class CourierEarningsPaymentModelTest {

    @Test
    fun test_PAY001_CommerceDistanceEarnings() {
        val order = PedidoOfrecido(
            id = "ord-101",
            status = "completed",
            serviceType = "COMMERCE_DELIVERY",
            routeDistanceKm = 3.5,
            courierRatePerKmApplied = 7.0,
            courierOrderBonusApplied = 10.0,
            courierDistanceEarnings = 24.50,
            courierBonusEarnings = 10.00,
            courierTotalEarnings = 34.50,
            total = 200.0,
            pagoMetodo = "efectivo"
        )

        val state = CourierFinanceCalculator.computeFinances(
            orders = listOf(order),
            filter = FinanceDateFilter.TODAY,
            nowMs = System.currentTimeMillis()
        )

        assertEquals(1, state.totalGeneralCount)
        assertEquals(34.50, state.totalGeneralEarnings, 0.001)
        assertEquals(24.50, state.totalGeneralDistanceEarnings, 0.001)
        assertEquals(10.00, state.totalGeneralBonusEarnings, 0.001)
        assertEquals(3.5, state.totalGeneralDistanceKm, 0.001)
    }

    @Test
    fun test_PAY004_FullBreakdownWithTips() {
        val order = PedidoOfrecido(
            id = "ord-104",
            status = "delivered",
            serviceType = "COMMERCE_DELIVERY",
            routeDistanceKm = 3.5,
            courierRatePerKmApplied = 7.0,
            courierOrderBonusApplied = 10.0,
            courierDistanceEarnings = 24.50,
            courierBonusEarnings = 10.00,
            courierTipEarnings = 20.00,
            courierTotalEarnings = 54.50,
            tip = 20.00,
            total = 300.0,
            pagoMetodo = "tarjeta"
        )

        val state = CourierFinanceCalculator.computeFinances(
            orders = listOf(order),
            filter = FinanceDateFilter.TODAY,
            nowMs = System.currentTimeMillis()
        )

        assertEquals(54.50, state.totalGeneralEarnings, 0.001)
        assertEquals(24.50, state.totalGeneralDistanceEarnings, 0.001)
        assertEquals(10.00, state.totalGeneralBonusEarnings, 0.001)
        assertEquals(20.00, state.totalGeneralTips, 0.001)
        assertEquals(0.0, state.totalGeneralCashReceived, 0.001) // Pago con tarjeta
    }

    @Test
    fun test_PAY005_XToYDeliveryEarnings() {
        val trip = PedidoOfrecido(
            id = "trip-201",
            status = "completed",
            serviceType = "X_TO_Y_DELIVERY",
            routeDistanceKm = 5.0,
            courierRatePerKmApplied = 7.0,
            courierOrderBonusApplied = 10.0,
            courierDistanceEarnings = 35.00,
            courierBonusEarnings = 10.00,
            courierTotalEarnings = 45.00,
            total = 120.0,
            cashReceived = 120.0,
            pagoMetodo = "efectivo"
        )

        val state = CourierFinanceCalculator.computeFinances(
            orders = listOf(trip),
            filter = FinanceDateFilter.TODAY,
            nowMs = System.currentTimeMillis()
        )

        assertEquals(45.00, state.xToYSummary.totalEarnings, 0.001)
        assertEquals(35.00, state.xToYSummary.totalDistanceEarnings, 0.001)
        assertEquals(10.00, state.xToYSummary.totalBonusEarnings, 0.001)
        assertEquals(120.0, state.xToYSummary.totalCashReceived, 0.001)
    }

    @Test
    fun test_PAY012_DisjointMultiDomainAggregation() {
        val commerce = PedidoOfrecido(
            id = "comm-1",
            status = "completed",
            serviceType = "COMMERCE_DELIVERY",
            routeDistanceKm = 2.0,
            courierRatePerKmApplied = 7.0,
            courierOrderBonusApplied = 10.0,
            courierDistanceEarnings = 14.00,
            courierBonusEarnings = 10.00,
            courierTotalEarnings = 24.00,
            total = 150.0,
            pagoMetodo = "efectivo"
        )

        val xy = PedidoOfrecido(
            id = "xy-1",
            status = "completed",
            serviceType = "X_TO_Y_DELIVERY",
            routeDistanceKm = 4.0,
            courierRatePerKmApplied = 7.0,
            courierOrderBonusApplied = 10.0,
            courierDistanceEarnings = 28.00,
            courierBonusEarnings = 10.00,
            courierTotalEarnings = 38.00,
            total = 80.0,
            pagoMetodo = "tarjeta"
        )

        val state = CourierFinanceCalculator.computeFinances(
            orders = listOf(commerce, xy),
            filter = FinanceDateFilter.TODAY,
            nowMs = System.currentTimeMillis()
        )

        assertEquals(2, state.totalGeneralCount)
        assertEquals(62.00, state.totalGeneralEarnings, 0.001) // 24 + 38 = 62
        assertEquals(42.00, state.totalGeneralDistanceEarnings, 0.001) // 14 + 28 = 42
        assertEquals(20.00, state.totalGeneralBonusEarnings, 0.001) // 10 + 10 = 20
        assertEquals(6.0, state.totalGeneralDistanceKm, 0.001) // 2 + 4 = 6
        assertEquals(150.0, state.totalGeneralCashReceived, 0.001) // Solo el commerce fue en efectivo
    }

    @Test
    fun test_FV002_Case5000Custody_1100Earnings() {
        val order1 = PedidoOfrecido(
            id = "ord-1",
            status = "completed",
            serviceType = "COMMERCE_DELIVERY",
            routeDistanceKm = 142.857,
            courierRatePerKmApplied = 7.0,
            courierOrderBonusApplied = 100.0,
            courierDistanceEarnings = 1000.0,
            courierBonusEarnings = 100.0,
            courierTotalEarnings = 1100.0,
            total = 5000.0,
            cashReceived = 5000.0,
            compensatedAmount = 1100.0,
            pagoMetodo = "efectivo"
        )

        val state = CourierFinanceCalculator.computeFinances(
            orders = listOf(order1),
            filter = FinanceDateFilter.TODAY,
            nowMs = System.currentTimeMillis()
        )

        assertEquals(1100.0, state.totalGeneralEarnings, 0.001)
        assertEquals(5000.0, state.totalGeneralCashReceived, 0.001)
        assertEquals(1100.0, state.totalGeneralCompensated, 0.001)
        assertEquals(3900.0, state.totalGeneralRequiredDeposit, 0.001) // 5000 - 1100 = 3900
    }

    @Test
    fun test_REAL_VALIDATION_Case1605Total_100CourierEarnings_1505Deposit() {
        val order = PedidoOfrecido(
            id = "ord-JE74SB",
            status = "completed",
            serviceType = "COMMERCE_DELIVERY",
            subtotalProductos = 1500.0,
            deliveryFee = 60.0,
            additionalCharge = 5.0,
            tip = 40.0,
            total = 1605.0,
            cashReceived = 1605.0,
            courierTotalEarnings = 100.0, // C$60 delivery fee + C$40 propina
            compensatedAmount = 100.0,
            pagoMetodo = "efectivo"
        )

        val state = CourierFinanceCalculator.computeFinances(
            orders = listOf(order),
            filter = FinanceDateFilter.TODAY,
            nowMs = System.currentTimeMillis()
        )

        assertEquals(1, state.totalGeneralCount)
        assertEquals(100.0, state.totalGeneralEarnings, 0.001)
        assertEquals(1605.0, state.totalGeneralCashReceived, 0.001)
        assertEquals(100.0, state.totalGeneralCompensated, 0.001)
        assertEquals(1505.0, state.totalGeneralRequiredDeposit, 0.001) // 1605 - 100 = 1505 (NUNCA 1555)
    }
}
