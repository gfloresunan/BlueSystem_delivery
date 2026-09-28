package com.example.kds

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.engine.order.InventoryReservationEngine
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
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderToKdsE2ETest {

    private val validationEngine = OrderValidationEngine()
    private val paymentGateway = PaymentSimulatorImpl()
    private val inventoryEngine = InventoryReservationEngine()
    private val lifecycleEngine = OrderLifecycleEngine()
    private val queueEngine = KdsQueueEngine()

    @Test
    fun `E2E 1 - Full Flow Client Creation to KDS Arrival under 2 seconds`() = runBlocking {
        val startTime = System.currentTimeMillis()

        // 1. Snapshot del menú de la Serie 13B
        val cat = MenuCategory(id = "c1", primaryName = "Platos Fuertes", restaurantId = "rest1")
        val prod = MenuProduct(id = "p1", name = "Ribeye Steak 400g", basePrice = 550.0, restaurantId = "rest1")
        val checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(listOf(cat), listOf(prod))
        val snapshot = MenuSnapshot(restaurantId = "rest1", categories = listOf(cat), products = listOf(prod), sha256Checksum = checksum)

        // 2. Cliente crea pedido
        val order = Order(
            id = "ord_1001",
            restaurantId = "rest1",
            items = listOf(OrderItem(id = "i1", productId = "p1", productName = "Ribeye Steak 400g", targetStation = KitchenStation.GRILL))
        )

        // 3. Validación contra Snapshot 13B
        val validationResult = validationEngine.validateOrderAgainstSnapshot(order, snapshot)
        assertTrue(validationResult.isValid)

        // 4. Reserva de Inventario (HELD)
        val reserveResult = inventoryEngine.reserveInventory(order.id, "rest1", "branch1", order.items)
        assertTrue(reserveResult.isSuccess)

        // 5. Procesamiento de Pago Simulado
        val paymentResponse = paymentGateway.processPayment(PaymentRequest(order.id, 550.0))
        assertTrue(paymentResponse.isSuccess)

        // 6. Confirmación Comercial
        val confirmResult = lifecycleEngine.updateCommercialStatus(order, CommercialStatus.CONFIRMED, UserRole.CASHIER)
        assertTrue(confirmResult is com.example.domain.engine.order.LifecycleTransitionResult.Success)
        val confirmedOrder = (confirmResult as com.example.domain.engine.order.LifecycleTransitionResult.Success).updatedOrder

        // 7. Entrada a Cola KDS en menos de 2 segundos
        val ticket = queueEngine.enqueue(confirmedOrder, KitchenStation.GRILL)
        val endTime = System.currentTimeMillis()

        assertNotNull(ticket)
        assertEquals(OperationalStatus.QUEUED, ticket.status)
        assertTrue("El tiempo de llegada al KDS debe ser menor a 2000ms", (endTime - startTime) < 2000L)
    }
}
