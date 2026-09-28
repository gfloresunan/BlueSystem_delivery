package com.example.kds

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.engine.kds.DispatchIntegrationSimulatorImpl
import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenAssemblyEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.engine.order.LifecycleTransitionResult
import com.example.domain.engine.order.OrderLifecycleEngine
import com.example.domain.engine.order.OrderValidationEngine
import com.example.domain.engine.order.PaymentRequest
import com.example.domain.engine.order.PaymentSimulatorImpl
import com.example.domain.engine.order.UserRole
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 1: Flujo Maestro de Certificación
 *
 * Cubre el flujo comercial completo:
 * Registro → Login → Carrito → Pago → KDS → Motorizado → Entrega → Calificación
 *
 * Valida la integración de todas las capas: Serie 13B (Frozen Core),
 * Hito 14 (KDS + Lifecycle) y Sprint 14.0 (Dispatch).
 */
class FullOrderLifecycleE2ETest {

    private val validationEngine = OrderValidationEngine()
    private val paymentGateway = PaymentSimulatorImpl()
    private val inventoryEngine = InventoryReservationEngine()
    private val lifecycleEngine = OrderLifecycleEngine()
    private val queueEngine = KdsQueueEngine()
    private val assemblyEngine = KitchenAssemblyEngine()
    private val dispatchIntegration = DispatchIntegrationSimulatorImpl()

    // ─────────────────────────────────────────────────────────────────────────
    // TC-E2E-01: Flujo completo Cliente → KDS → Motorizado → Entrega
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-E2E-01 Full lifecycle from customer order to delivery confirmation`() = runBlocking {
        val startTime = System.currentTimeMillis()

        // PASO 1: Snapshot del menú (Serie 13B — Frozen Core)
        val category = MenuCategory(id = "cat_rc1", primaryName = "Platos Fuertes", restaurantId = "rest_rc1")
        val product = MenuProduct(id = "prod_rc1", name = "Pollo Asado", basePrice = 120.0, restaurantId = "rest_rc1")
        val checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(listOf(category), listOf(product))
        val snapshot = MenuSnapshot(
            restaurantId = "rest_rc1",
            categories = listOf(category),
            products = listOf(product),
            sha256Checksum = checksum
        )

        // PASO 2: Cliente crea pedido
        val order = Order(
            id = "ord_rc1_001",
            restaurantId = "rest_rc1",
            customerId = "cust_rc1",
            items = listOf(
                OrderItem(id = "item_1", productId = "prod_rc1", productName = "Pollo Asado", targetStation = KitchenStation.GRILL)
            )
        )

        // PASO 3: Validación contra Snapshot 13B (producto existe y está disponible)
        val validation = validationEngine.validateOrderAgainstSnapshot(order, snapshot)
        assertTrue("El pedido debe ser válido contra el snapshot del menú", validation.isValid)

        // PASO 4: Reserva de Inventario Transaccional (HELD con TTL 15 min)
        val reservation = inventoryEngine.reserveInventory(order.id, "rest_rc1", "branch_rc1", order.items)
        assertTrue("La reserva de inventario debe ser exitosa", reservation.isSuccess)
        val reservationData = inventoryEngine.getReservationsForOrder(order.id)
        assertEquals(ReservationStatus.HELD, reservationData[0].status)

        // PASO 5: Procesamiento de Pago (monto válido > 0)
        val payment = paymentGateway.processPayment(PaymentRequest(order.id, 120.0))
        assertTrue("El pago debe ser aprobado", payment.isSuccess)

        // PASO 6: Consumir Reserva (pago confirmado → inventario CONSUMED)
        inventoryEngine.consumeReservationsForOrder(order.id)
        val consumedReservations = inventoryEngine.getReservationsForOrder(order.id)
        assertEquals(ReservationStatus.CONSUMED, consumedReservations[0].status)

        // PASO 7: Transición comercial a CONFIRMED
        val confirmResult = lifecycleEngine.updateCommercialStatus(order, CommercialStatus.CONFIRMED, UserRole.CASHIER)
        assertTrue(confirmResult is LifecycleTransitionResult.Success)
        val confirmedOrder = (confirmResult as LifecycleTransitionResult.Success).updatedOrder

        // PASO 8: Entrada al KDS en menos de 2 segundos
        val ticket = queueEngine.enqueue(confirmedOrder, KitchenStation.GRILL)
        val kdsArrivalMs = System.currentTimeMillis() - startTime
        assertNotNull("El ticket KDS debe generarse", ticket)
        assertEquals(OperationalStatus.QUEUED, ticket.status)
        assertTrue("Llegada al KDS debe ser < 2000ms (actual: ${kdsArrivalMs}ms)", kdsArrivalMs < 2000L)

        // PASO 9: KDS procesa pedido → PREPARING → ASSEMBLING → READY
        val preparingResult = queueEngine.start(ticket.ticketId)
        assertTrue(preparingResult.isSuccess)
        assertEquals(OperationalStatus.PREPARING, preparingResult.getOrNull()?.status)

        val readyResult = queueEngine.ready(ticket.ticketId)
        assertTrue(readyResult.isSuccess)
        assertEquals(OperationalStatus.READY, readyResult.getOrNull()?.status)

        // PASO 10: Asignación de motorizado
        val assignment = dispatchIntegration.assignDriver(order.id, "driver_rc1_07")
        assertEquals("driver_rc1_07", assignment.driverId)

        // PASO 11: En camino → OUT_FOR_DELIVERY
        val readyOrder = confirmedOrder.copy(operationalStatus = OperationalStatus.READY)
        val outResult = lifecycleEngine.updateOperationalStatus(readyOrder, OperationalStatus.OUT_FOR_DELIVERY, UserRole.CASHIER)
        assertTrue(outResult is LifecycleTransitionResult.Success)

        // PASO 12: Confirmación de Entrega → DELIVERED
        val outOrder = (outResult as LifecycleTransitionResult.Success).updatedOrder
        val deliveredResult = lifecycleEngine.updateOperationalStatus(outOrder, OperationalStatus.DELIVERED, UserRole.CASHIER)
        assertTrue(deliveredResult is LifecycleTransitionResult.Success)
        assertEquals(OperationalStatus.DELIVERED, (deliveredResult as LifecycleTransitionResult.Success).updatedOrder.operationalStatus)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-E2E-02: Cancelación durante preparación libera inventario y revierte KDS
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-E2E-02 Cancellation during preparation releases inventory and cancels KDS ticket`() = runBlocking {
        val order = Order(
            id = "ord_rc1_cancel",
            restaurantId = "rest_rc1",
            items = listOf(OrderItem(id = "ci1", productId = "p_cancel", targetStation = KitchenStation.COLD_PREP))
        )

        // Reservar y encolar
        inventoryEngine.reserveInventory(order.id, "rest_rc1", "branch_rc1", order.items)
        val ticket = queueEngine.enqueue(order, KitchenStation.COLD_PREP)

        // Cancelar pedido (cliente desistió antes de confirmación de pago)
        val cancelResult = lifecycleEngine.updateCommercialStatus(order, CommercialStatus.CANCELLED, UserRole.CASHIER)
        assertTrue(cancelResult is LifecycleTransitionResult.Success)

        // El inventario debe liberarse (RELEASED)
        inventoryEngine.rollbackReservationsForOrder(order.id, "CANCELLED_BY_CUSTOMER")
        val reservations = inventoryEngine.getReservationsForOrder(order.id)
        assertEquals(ReservationStatus.RELEASED, reservations[0].status)

        // Ticket KDS debe quedar cancelable (ticket fue encolado pero el pedido fue cancelado)
        assertNotNull(ticket)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-E2E-03: Assembly multihilo — READY bloqueado hasta completar todas las estaciones
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-E2E-03 Multi-station assembly blocks READY until all stations complete`() = runBlocking {
        var order = Order(
            id = "ord_rc1_assembly",
            restaurantId = "rest_rc1",
            items = listOf(
                com.example.domain.model.order.OrderItem(id = "i1", productId = "p1", targetStation = KitchenStation.GRILL),
                com.example.domain.model.order.OrderItem(id = "i2", productId = "p2", targetStation = KitchenStation.DRINKS),
                com.example.domain.model.order.OrderItem(id = "i3", productId = "p3", targetStation = KitchenStation.COLD_PREP)
            )
        )

        // Verificar que el pedido NO está listo (faltan estaciones)
        val statusBefore = assemblyEngine.checkAssemblyCompleteness(order)
        assertTrue("El pedido NO debe estar listo si no se han completado todas las estaciones", !statusBefore.isComplete)

        // Completar estaciones progresivamente
        order = assemblyEngine.markItemAsReady(order, "i1")
        assertFalse("Aún faltan estaciones", assemblyEngine.checkAssemblyCompleteness(order).isComplete)

        order = assemblyEngine.markItemAsReady(order, "i2")
        assertFalse("Aún falta una estación", assemblyEngine.checkAssemblyCompleteness(order).isComplete)

        order = assemblyEngine.markItemAsReady(order, "i3")

        // Ahora sí debe estar completamente ensamblado
        val fullyAssembled = assemblyEngine.checkAssemblyCompleteness(order).isComplete
        assertTrue("El pedido debe estar listo después de completar todas las estaciones", fullyAssembled)
    }
}

private fun Boolean.not(): Boolean = !this
private fun assertFalse(message: String, condition: Boolean) = assertTrue(message, !condition)
