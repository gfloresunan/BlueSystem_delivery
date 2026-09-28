package com.example.finance

import com.example.domain.model.finance.*
import com.example.presentation.business.finance.FinanceSubTab
import com.example.presentation.business.finance.MerchantFinanceViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class MerchantFinanceViewModelTest {

    private lateinit var viewModel: MerchantFinanceViewModel

    @Before
    fun setUp() {
        viewModel = MerchantFinanceViewModel()
    }

    @Test
    fun testInitialFinanceState() {
        viewModel.startFinanceCenter("biz_demo_123")
        assertEquals("biz_demo_123", viewModel.uiState.value.businessId)
        assertEquals(FinanceSubTab.RESUMEN, viewModel.uiState.value.activeSubTab)
        assertFalse(viewModel.uiState.value.isSubmittingAction)
        assertNull(viewModel.uiState.value.selectedSettlement)
        assertNull(viewModel.uiState.value.selectedOrderEvent)
    }

    @Test
    fun testSetFilterUpdatesState() {
        viewModel.setFilter(FinancialFilter.THIS_MONTH)
        assertEquals(FinancialFilter.THIS_MONTH, viewModel.uiState.value.activeFilter)
    }

    @Test
    fun testSwitchSubTabs() {
        viewModel.selectTab(FinanceSubTab.TRANSACTIONS)
        assertEquals(FinanceSubTab.TRANSACTIONS, viewModel.uiState.value.activeSubTab)

        viewModel.selectTab(FinanceSubTab.SETTLEMENTS)
        assertEquals(FinanceSubTab.SETTLEMENTS, viewModel.uiState.value.activeSubTab)

        viewModel.selectTab(FinanceSubTab.RESUMEN)
        assertEquals(FinanceSubTab.RESUMEN, viewModel.uiState.value.activeSubTab)
    }

    @Test
    fun testOrderEventSelection() {
        val event = FinancialEvent(
            eventId = "evt_001",
            orderId = "ord_001",
            merchantGrossSalesCents = 25000L,
            merchantCommissionAmountCents = 3750L,
            merchantNetPayoutCents = 21250L
        )
        viewModel.selectOrderEvent(event)
        assertEquals("evt_001", viewModel.uiState.value.selectedOrderEvent?.eventId)

        viewModel.selectOrderEvent(null)
        assertNull(viewModel.uiState.value.selectedOrderEvent)
    }

    @Test
    fun testSettlementDetailSelection() {
        val settlement = MerchantSettlement(
            settlementId = "set_100",
            businessId = "biz_001",
            grossSalesCents = 100000L,
            platformFeesCents = 15000L,
            netPayableCents = 85000L,
            status = SettlementStatus.AWAITING_CONFIRMATION
        )

        viewModel.selectSettlement(settlement)
        assertEquals("set_100", viewModel.uiState.value.selectedSettlement?.settlementId)
        assertTrue(settlement.isAwaitingConfirmation)
        assertEquals(850.0, settlement.netPayableNio, 0.001)

        viewModel.selectSettlement(null)
        assertNull(viewModel.uiState.value.selectedSettlement)
    }

    @Test
    fun testFinancialSummaryCentArithmeticIntegrity() {
        val summary = FinancialSummary(
            businessId = "biz_demo",
            revenueCents = 543210L, // C$ 5,432.10
            ordersCount = 10,
            platformFeesCents = 81481L, // C$ 814.81
            netRevenueCents = 461729L  // C$ 4,617.29
        )

        assertEquals(5432.10, summary.revenueNio, 0.001)
        assertEquals(814.81, summary.platformFeesNio, 0.001)
        assertEquals(4617.29, summary.netRevenueNio, 0.001)
        assertEquals(54321L, summary.averageTicketCents) // 543210 / 10
        assertEquals(543.21, summary.averageTicketNio, 0.001)
    }

    @Test
    fun testOrderDisplayCodeAndVisibilityRefinement_WithoutDiscount() {
        // Pedido de referencia canónica: Lxg9Bn29kVuHKUVjxckQ (Variedades TECNOHOME)
        val event = FinancialEvent(
            eventId = "fe_001",
            businessId = "90169f49-9d0c-4571-97a5-5f19032a6f42",
            orderId = "Lxg9Bn29kVuHKUVjxckQ",
            orderCode = "VAT000002",
            commissionRate = 0.15,
            subtotalCents = 100000L,
            merchantGrossSalesCents = 100000L,
            discountCents = 0L,
            merchantCommissionAmountCents = 15000L,
            merchantNetPayoutCents = 85000L,
            deliveryFeeCents = 6000L,
            tipCents = 0L,
            orderTotalCents = 106500L
        )

        // 1. Código comercial canónico
        assertEquals("VAT000002", event.displayOrderCode)

        // 2. Valores para desglose Comercio
        assertEquals(1000.0, event.subtotalNio, 0.001)
        assertEquals(1000.0, event.merchantGrossSalesCents / 100.0, 0.001)
        assertEquals(0L, event.discountCents) // Descuento = 0 -> fila se oculta en UI
        assertEquals(150.0, event.commissionNio, 0.001)
        assertEquals(850.0, event.netPayoutNio, 0.001)
        assertEquals("15%", event.commissionPercentageText)

        // 3. Campos que deben permanecer ocultos para comercio en UI pero inmutables en SSOT
        assertEquals(60.0, event.deliveryFeeNio, 0.001)
        assertEquals(0.0, event.tipNio, 0.001)
        assertEquals(1065.0, event.orderTotalNio, 0.001)
    }

    @Test
    fun testOrderDisplayCodeAndVisibilityRefinement_WithDiscount() {
        val event = FinancialEvent(
            eventId = "fe_002",
            orderId = "ord_discount_01",
            orderCode = "FRT000026",
            commissionRate = 0.15,
            subtotalCents = 100000L,
            discountCents = 10000L, // C$ 100.00
            merchantGrossSalesCents = 90000L, // C$ 900.00 base imponible neta comercio
            merchantCommissionAmountCents = 13500L, // C$ 135.00
            merchantNetPayoutCents = 76500L, // C$ 765.00
            deliveryFeeCents = 6000L,
            tipCents = 2000L,
            orderTotalCents = 108000L
        )

        assertEquals("FRT000026", event.displayOrderCode)
        assertEquals(100.0, event.discountNio, 0.001)
        assertTrue(event.discountCents > 0) // Descuento > 0 -> fila visible
        assertEquals(135.0, event.commissionNio, 0.001)
        assertEquals(765.0, event.netPayoutNio, 0.001)
        assertEquals("15%", event.commissionPercentageText)
    }

    @Test
    fun testDisplayOrderCodeFallbackWhenBlank() {
        val event = FinancialEvent(
            eventId = "fe_fallback",
            orderId = "Lxg9Bn29kVuHKUVjxckQ",
            orderCode = "" // No resuelto aún
        )
        // Fallback a los últimos 6 caracteres en mayúsculas
        assertEquals("VJXCKQ", event.displayOrderCode)
    }

    @Test
    fun testDynamicCommissionPercentageFormatting() {
        val event12 = FinancialEvent(commissionRate = 0.12)
        assertEquals("12%", event12.commissionPercentageText)

        val event125 = FinancialEvent(commissionRate = 0.125)
        assertEquals("12.5%", event125.commissionPercentageText)

        // Derivado por importes si commissionRate == 0
        val eventDerived = FinancialEvent(
            merchantGrossSalesCents = 100000L,
            merchantCommissionAmountCents = 15000L
        )
        assertEquals("15%", eventDerived.commissionPercentageText)
    }
}

