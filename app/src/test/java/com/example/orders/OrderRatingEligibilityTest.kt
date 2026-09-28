package com.example.orders

import com.example.Pedido
import com.example.presentation.customer.profile.OrderPresentationResolver
import com.google.firebase.Timestamp
import org.junit.Assert.*
import org.junit.Test

/**
 * Protocol: BSD-ORDER-CLOSURE-RATING-QUIRURGICAL-FIX-001
 * Test suite for Rating Eligibility, Multi-Generation Orders (Legacy, Current, New),
 * Critical Gate (Completed without deliveredAt), and Canonical Courier Resolution.
 */
class OrderRatingEligibilityTest {

    // ─── GENERACIÓN A: Pedido Histórico (Legacy) ─────────────────────────────
    @Test
    fun test01_generationA_legacyOrderDelivered_isEligible() {
        val order = Pedido(
            pedidoId = "ord_legacy_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "delivered",
            hasBeenRated = false
        )
        assertTrue("Legacy delivered order must be physically delivered", OrderPresentationResolver.isOrderPhysicallyDelivered(order))
        assertTrue("Legacy delivered order must be rating eligible", OrderPresentationResolver.isOrderRatingEligible(order, "cust_100"))
    }

    @Test
    fun test02_generationA_legacyOrderEntregadoSpanish_isEligible() {
        val order = Pedido(
            pedidoId = "ord_legacy_2",
            businessId = "biz_001",
            clienteId = "cust_100",
            estado = "entregado",
            hasBeenRated = false
        )
        assertTrue("Legacy entregado order must be physically delivered", OrderPresentationResolver.isOrderPhysicallyDelivered(order))
        assertTrue("Legacy entregado order must be rating eligible", OrderPresentationResolver.isOrderRatingEligible(order, "cust_100"))
    }

    // ─── GENERACIÓN B: Pedido Actualmente Existente (Current / Problem Type) ───
    @Test
    fun test03_generationB_currentOrder_completedWithDeliveredAt_isEligible() {
        val now = Timestamp(1700000000L, 0)
        val order = Pedido(
            pedidoId = "ord_current_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "completed",
            estado = "completado",
            deliveredAt = now,
            completedAt = now,
            hasBeenRated = false
        )
        assertTrue("Completed order with deliveredAt must be physically delivered", OrderPresentationResolver.isOrderPhysicallyDelivered(order))
        assertTrue("Completed order with deliveredAt must be rating eligible", OrderPresentationResolver.isOrderRatingEligible(order, "cust_100"))
    }

    // ─── PRUEBA CRÍTICA OBLIGATORIA: COMPLETED sin deliveredAt ───────────────
    @Test
    fun test04_criticalGate_completedWithoutDeliveredAt_isNOTEligible() {
        val now = Timestamp(1700000000L, 0)
        val order = Pedido(
            pedidoId = "ord_admin_closure_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "completed",
            estado = "completado",
            deliveredAt = null, // <- Administrative or financial closure WITHOUT physical courier delivery confirmation
            completedAt = now,
            hasBeenRated = false
        )
        assertFalse(
            "CRITICAL GATE: completed WITHOUT deliveredAt must NOT be considered physically delivered",
            OrderPresentationResolver.isOrderPhysicallyDelivered(order)
        )
        assertFalse(
            "CRITICAL GATE: completed WITHOUT deliveredAt must NOT be rating eligible",
            OrderPresentationResolver.isOrderRatingEligible(order, "cust_100")
        )
    }

    // ─── GENERACIÓN C: Pedido Nuevo (Post-Fix) ───────────────────────────────
    @Test
    fun test05_generationC_newOrderDelivered_isEligible() {
        val now = Timestamp(1700000500L, 0)
        val order = Pedido(
            pedidoId = "ord_new_1",
            businessId = "biz_001",
            customerId = "cust_100",
            assignedCourierId = "cour_canonical_99",
            status = "completed",
            deliveredAt = now,
            completedAt = now,
            hasBeenRated = false
        )
        assertTrue("New order with deliveredAt must be physically delivered", OrderPresentationResolver.isOrderPhysicallyDelivered(order))
        assertTrue("New order with deliveredAt must be rating eligible", OrderPresentationResolver.isOrderRatingEligible(order, "cust_100"))
    }

    // ─── CASOS NEGATIVOS DE ELEGIBILIDAD ─────────────────────────────────────
    @Test
    fun test06_alreadyRated_isNOTEligible() {
        val now = Timestamp(1700000000L, 0)
        val order = Pedido(
            pedidoId = "ord_rated_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "completed",
            deliveredAt = now,
            hasBeenRated = true,
            rating = 5
        )
        assertTrue("Physical delivery check passes", OrderPresentationResolver.isOrderPhysicallyDelivered(order))
        assertFalse("Already rated order must NOT be rating eligible", OrderPresentationResolver.isOrderRatingEligible(order, "cust_100"))
    }

    @Test
    fun test07_wrongCustomerOwnership_isNOTEligible() {
        val now = Timestamp(1700000000L, 0)
        val order = Pedido(
            pedidoId = "ord_foreign_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "delivered",
            deliveredAt = now,
            hasBeenRated = false
        )
        assertFalse("Order belonging to cust_100 cannot be rated by cust_200", OrderPresentationResolver.isOrderRatingEligible(order, "cust_200"))
    }

    @Test
    fun test08_cancelledOrder_isNOTEligible() {
        val order = Pedido(
            pedidoId = "ord_cancel_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "cancelled",
            hasBeenRated = false
        )
        assertFalse("Cancelled order must not be physically delivered", OrderPresentationResolver.isOrderPhysicallyDelivered(order))
        assertFalse("Cancelled order must not be rating eligible", OrderPresentationResolver.isOrderRatingEligible(order, "cust_100"))
    }

    @Test
    fun test09_pendingOrInTransitOrder_isNOTEligible() {
        val orderPending = Pedido(
            pedidoId = "ord_pending_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "pending",
            hasBeenRated = false
        )
        val orderInTransit = Pedido(
            pedidoId = "ord_transit_1",
            businessId = "biz_001",
            customerId = "cust_100",
            status = "in_transit",
            hasBeenRated = false
        )
        assertFalse(OrderPresentationResolver.isOrderPhysicallyDelivered(orderPending))
        assertFalse(OrderPresentationResolver.isOrderRatingEligible(orderPending, "cust_100"))
        assertFalse(OrderPresentationResolver.isOrderPhysicallyDelivered(orderInTransit))
        assertFalse(OrderPresentationResolver.isOrderRatingEligible(orderInTransit, "cust_100"))
    }

    // ─── RESOLUCIÓN CANÓNICA DE IDENTIDAD DEL MOTORIZADO (ETAPA 2.2) ─────────
    @Test
    fun test10_canonicalCourierResolution_assignedCourierIdOnly() {
        val order = Pedido(
            pedidoId = "ord_c1",
            assignedCourierId = "cour_canonical_01",
            motorizadoId = ""
        )
        assertEquals("cour_canonical_01", OrderPresentationResolver.resolveCanonicalCourierId(order))
    }

    @Test
    fun test11_canonicalCourierResolution_motorizadoIdOnly() {
        val order = Pedido(
            pedidoId = "ord_c2",
            assignedCourierId = "",
            motorizadoId = "cour_legacy_02"
        )
        assertEquals("cour_legacy_02", OrderPresentationResolver.resolveCanonicalCourierId(order))
    }

    @Test
    fun test12_canonicalCourierResolution_bothPresent_prefersAssigned() {
        val order = Pedido(
            pedidoId = "ord_c3",
            assignedCourierId = "cour_canonical_03",
            motorizadoId = "cour_legacy_03"
        )
        assertEquals("cour_canonical_03", OrderPresentationResolver.resolveCanonicalCourierId(order))
    }

    @Test
    fun test13_canonicalCourierResolution_bothEmpty() {
        val order = Pedido(
            pedidoId = "ord_c4",
            assignedCourierId = "",
            motorizadoId = ""
        )
        assertEquals("", OrderPresentationResolver.resolveCanonicalCourierId(order))
    }
}
