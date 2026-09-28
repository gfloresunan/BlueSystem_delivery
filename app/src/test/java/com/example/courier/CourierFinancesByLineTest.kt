package com.example.courier

import com.example.FinanceDateFilter
import com.example.PedidoOfrecido
import com.example.domain.engine.courier.CourierFinanceCalculator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

/**
 * Suite de Pruebas Forenses y Certificación E2E para Actividad #13:
 * Finanzas del Motorizado por Línea de Negocio (BSDEL-C13-FINANCE-COURIER-LINES).
 */
class CourierFinancesByLineTest {

    private val baseTime = 1756300000000L // Reference anchor timestamp

    @Test
    fun `test 01 - Commerce delivery completed calculates exclusively under commerce line`() {
        val order = PedidoOfrecido(
            id = "ord_commerce_001",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 45.0,
            comercioNombre = "Fritanga Doña Tania",
            clienteDireccion = "Altamira D'Este #12",
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(order),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        assertEquals(1, result.commerceSummary.count)
        assertEquals(45.0, result.commerceSummary.totalEarnings, 0.001)
        assertEquals(0, result.xToYSummary.count)
        assertEquals(0.0, result.xToYSummary.totalEarnings, 0.001)
        assertEquals(45.0, result.totalGeneralEarnings, 0.001)
        assertEquals(1, result.totalGeneralCount)
    }

    @Test
    fun `test 02 - Point A to Point B completed calculates exclusively under X to Y line`() {
        val trip = PedidoOfrecido(
            id = "trip_xy_002",
            serviceType = "X_TO_Y_DELIVERY",
            status = "delivered",
            customerOffer = 80.0,
            calculatedFee = 75.0,
            gananciaRepartidor = 0.0,
            senderName = "Carlos Rivas",
            comercioDireccion = "Bello Horizonte VI Etapa",
            clienteDireccion = "Carretera a Masaya Km 10",
            deliveredAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(trip),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        assertEquals(0, result.commerceSummary.count)
        assertEquals(0.0, result.commerceSummary.totalEarnings, 0.001)
        assertEquals(1, result.xToYSummary.count)
        assertEquals(80.0, result.xToYSummary.totalEarnings, 0.001)
        assertEquals(80.0, result.totalGeneralEarnings, 0.001)
        assertEquals(1, result.totalGeneralCount)
    }

    @Test
    fun `test 03 - Both lines of business sum up to exact total general with zero cross-contamination`() {
        val commerce1 = PedidoOfrecido(
            id = "ord_c1",
            serviceType = "COMMERCE_DELIVERY",
            status = "delivered",
            gananciaRepartidor = 50.0,
            completedAt = baseTime
        )
        val commerce2 = PedidoOfrecido(
            id = "ord_c2",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 35.0,
            completedAt = baseTime
        )
        val xToY1 = PedidoOfrecido(
            id = "trip_xy1",
            serviceType = "X_TO_Y_DELIVERY",
            status = "delivered",
            customerOffer = 110.0,
            deliveredAt = baseTime
        )
        val xToY2 = PedidoOfrecido(
            id = "trip_xy2",
            serviceType = "X_TO_Y_DELIVERY",
            status = "completed",
            customerOffer = null,
            gananciaRepartidor = 65.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(commerce1, commerce2, xToY1, xToY2),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        assertEquals(2, result.commerceSummary.count)
        assertEquals(85.0, result.commerceSummary.totalEarnings, 0.001)

        assertEquals(2, result.xToYSummary.count)
        assertEquals(175.0, result.xToYSummary.totalEarnings, 0.001)

        assertEquals(260.0, result.totalGeneralEarnings, 0.001)
        assertEquals(4, result.totalGeneralCount)
    }

    @Test
    fun `test 04 - Cancelled services yield zero earning and reflect cancelled status in history`() {
        val cancelledCommerce = PedidoOfrecido(
            id = "ord_canc_01",
            serviceType = "COMMERCE_DELIVERY",
            status = "cancelled",
            gananciaRepartidor = 40.0,
            completedAt = baseTime
        )
        val cancelledXToY = PedidoOfrecido(
            id = "trip_canc_02",
            serviceType = "X_TO_Y_DELIVERY",
            status = "cancelado",
            customerOffer = 90.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(cancelledCommerce, cancelledXToY),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        assertEquals(0, result.commerceSummary.count)
        assertEquals(0.0, result.commerceSummary.totalEarnings, 0.001)
        assertEquals(0, result.xToYSummary.count)
        assertEquals(0.0, result.xToYSummary.totalEarnings, 0.001)
        assertEquals(0.0, result.totalGeneralEarnings, 0.001)
        assertEquals(0, result.totalGeneralCount)

        assertEquals(2, result.items.size)
        assertTrue(result.items.all { !it.isCompleted })
        assertTrue(result.items.all { it.earningAmount == 0.0 })
    }

    @Test
    fun `test 05 - Deduplication prevents double counting of duplicate order IDs`() {
        val order1 = PedidoOfrecido(
            id = "ord_dup_001",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 50.0,
            completedAt = baseTime
        )
        val order1Duplicate = PedidoOfrecido(
            id = "ord_dup_001",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 50.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(order1, order1Duplicate),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        assertEquals(1, result.commerceSummary.count)
        assertEquals(50.0, result.commerceSummary.totalEarnings, 0.001)
        assertEquals(50.0, result.totalGeneralEarnings, 0.001)
        assertEquals(1, result.items.size)
    }

    @Test
    fun `test 06 - Date filter TODAY includes today orders and excludes yesterday`() {
        val todayCalendar = Calendar.getInstance().apply { timeInMillis = baseTime }
        val nowMs = todayCalendar.timeInMillis

        val yesterdayCalendar = Calendar.getInstance().apply {
            timeInMillis = baseTime
            add(Calendar.DAY_OF_YEAR, -1)
        }
        val yesterdayMs = yesterdayCalendar.timeInMillis

        val todayOrder = PedidoOfrecido(
            id = "ord_today",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 40.0,
            completedAt = nowMs
        )
        val yesterdayOrder = PedidoOfrecido(
            id = "ord_yesterday",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 60.0,
            completedAt = yesterdayMs
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(todayOrder, yesterdayOrder),
            filter = FinanceDateFilter.TODAY,
            nowMs = nowMs
        )

        assertEquals(1, result.commerceSummary.count)
        assertEquals(40.0, result.commerceSummary.totalEarnings, 0.001)
    }

    @Test
    fun `test 07 - Date filter YESTERDAY includes yesterday orders and excludes today`() {
        val todayCalendar = Calendar.getInstance().apply { timeInMillis = baseTime }
        val nowMs = todayCalendar.timeInMillis

        val yesterdayCalendar = Calendar.getInstance().apply {
            timeInMillis = baseTime
            add(Calendar.DAY_OF_YEAR, -1)
            set(Calendar.HOUR_OF_DAY, 14)
        }
        val yesterdayMs = yesterdayCalendar.timeInMillis

        val todayOrder = PedidoOfrecido(
            id = "ord_today",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 40.0,
            completedAt = nowMs
        )
        val yesterdayOrder = PedidoOfrecido(
            id = "ord_yesterday",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 60.0,
            completedAt = yesterdayMs
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(todayOrder, yesterdayOrder),
            filter = FinanceDateFilter.YESTERDAY,
            nowMs = nowMs
        )

        assertEquals(1, result.commerceSummary.count)
        assertEquals(60.0, result.commerceSummary.totalEarnings, 0.001)
    }

    @Test
    fun `test 08 - Custom date range filters accurately with inclusive boundary`() {
        val cal = Calendar.getInstance().apply { timeInMillis = baseTime }
        val startRange = cal.timeInMillis - 50000L
        val endRange = cal.timeInMillis + 50000L

        val inRangeOrder = PedidoOfrecido(
            id = "ord_in_range",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 55.0,
            completedAt = cal.timeInMillis
        )
        val outOfRangeOrder = PedidoOfrecido(
            id = "ord_out_range",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 90.0,
            completedAt = cal.timeInMillis + 200000L
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(inRangeOrder, outOfRangeOrder),
            filter = FinanceDateFilter.CUSTOM,
            customStart = startRange,
            customEnd = endRange,
            nowMs = baseTime
        )

        assertEquals(1, result.commerceSummary.count)
        assertEquals(55.0, result.commerceSummary.totalEarnings, 0.001)
    }

    @Test
    fun `test 09 - Traceability preserves reference entity and route in financial items`() {
        val xyTrip = PedidoOfrecido(
            id = "trip_trace_999",
            serviceType = "X_TO_Y_DELIVERY",
            status = "delivered",
            customerOffer = 125.50,
            senderName = "Marlon Brando",
            comercioDireccion = "Plaza Inter",
            clienteDireccion = "Galerías Santo Domingo",
            pagoMetodo = "tarjeta",
            deliveredAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(xyTrip),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        val item = result.items.first()
        assertEquals("trip_trace_999", item.orderId)
        assertEquals("X_TO_Y_DELIVERY", item.serviceType)
        assertEquals("#CE_999", item.referenceNumber)
        assertEquals("Remitente: Marlon Brando", item.entityName)
        assertEquals("Plaza Inter → Galerías Santo Domingo", item.routeDescription)
        assertEquals(125.50, item.earningAmount, 0.001)
        assertEquals("tarjeta", item.paymentMethod)
        assertTrue(item.isCompleted)
    }

    @Test
    fun `test 10 - FIN-001 Canonical Commerce Cash calculation separates cash collected from product and courier earnings`() {
        val commerceOrder = PedidoOfrecido(
            id = "ord_commerce_fin001",
            serviceType = "COMMERCE_DELIVERY",
            status = "delivered",
            total = 430.0,
            subtotalProductos = 350.0,
            deliveryFee = 50.0,
            tip = 20.0,
            additionalCharge = 10.0,
            gananciaRepartidor = 50.0,
            pagoMetodo = "efectivo",
            cashReceived = 430.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(commerceOrder),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        // Dinero recibido por cliente = C$ 430
        assertEquals(430.0, result.commerceSummary.totalCashReceived, 0.001)
        // Subtotal de productos = C$ 350
        assertEquals(350.0, result.commerceSummary.totalProductsAmount, 0.001)
        // Tarifa de entrega = C$ 50
        assertEquals(50.0, result.commerceSummary.totalDeliveryFees, 0.001)
        // Propinas = C$ 20
        assertEquals(20.0, result.commerceSummary.totalTips, 0.001)
        // Ganancia del courier = Delivery C$50 + Propina C$20 = C$70
        assertEquals(70.0, result.commerceSummary.totalEarnings, 0.001)
        // Pasivo de liquidación en efectivo = C$ 430
        assertEquals(430.0, result.commerceSummary.totalOutstandingSettlement, 0.001)
    }

    @Test
    fun `test 11 - FIN-002 Canonical X to Y Cash calculation preserves fee and tip with zero product amount`() {
        val xyTrip = PedidoOfrecido(
            id = "trip_xy_fin002",
            serviceType = "X_TO_Y_DELIVERY",
            status = "completed",
            total = 120.0,
            customerOffer = 100.0,
            calculatedFee = 100.0,
            tip = 20.0,
            pagoMetodo = "efectivo",
            cashReceived = 120.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(xyTrip),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        assertEquals(1, result.xToYSummary.count)
        assertEquals(100.0, result.xToYSummary.totalEarnings, 0.001)
        assertEquals(120.0, result.xToYSummary.totalCashReceived, 0.001)
        assertEquals(20.0, result.xToYSummary.totalTips, 0.001)
        assertEquals(0.0, result.xToYSummary.totalProductsAmount, 0.001)
        assertEquals(120.0, result.xToYSummary.totalOutstandingSettlement, 0.001)
    }

    @Test
    fun `test 12 - FIN-003 Consolidated lines maintain strict separation and aggregated totals`() {
        val commerce = PedidoOfrecido(
            id = "c_003",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            total = 500.0,
            subtotalProductos = 400.0,
            deliveryFee = 60.0,
            tip = 40.0,
            gananciaRepartidor = 60.0,
            pagoMetodo = "efectivo",
            cashReceived = 500.0,
            completedAt = baseTime
        )
        val xy = PedidoOfrecido(
            id = "xy_003",
            serviceType = "X_TO_Y_DELIVERY",
            status = "delivered",
            total = 150.0,
            customerOffer = 130.0,
            tip = 20.0,
            pagoMetodo = "tarjeta", // Digital payment -> zero cash received in hand
            cashReceived = 0.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(commerce, xy),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        // General Earnings: (60 + 40) + 130 = 230
        assertEquals(230.0, result.totalGeneralEarnings, 0.001)
        // General Cash Collected: 500 (Commerce Cash) + 0 (XY Card) = 500
        assertEquals(500.0, result.totalGeneralCashReceived, 0.001)
        // General Tips: 40 + 20 = 60
        assertEquals(60.0, result.totalGeneralTips, 0.001)
        // General Count: 2
        assertEquals(2, result.totalGeneralCount)
    }

    @Test
    fun `test 13 - Overdue Closure notice is preserved in state`() {
        val notice = com.example.OverdueClosureNotice(
            hasOverdue = true,
            overdueDate = "28/08/2026",
            outstandingAmount = 1850.0,
            closureId = "clos_28082026_m1",
            reason = "Cierre de día anterior pendiente"
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = emptyList(),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime,
            overdueNotice = notice
        )

        assertTrue(result.overduePendingClosure?.hasOverdue == true)
        assertEquals("28/08/2026", result.overduePendingClosure?.overdueDate)
        assertEquals(1850.0, result.overduePendingClosure?.outstandingAmount ?: 0.0, 0.001)
    }
}
