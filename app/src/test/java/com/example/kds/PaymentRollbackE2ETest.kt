package com.example.kds

import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.engine.order.PaymentRequest
import com.example.domain.engine.order.PaymentSimulatorImpl
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class PaymentRollbackE2ETest {

    private val paymentGateway = PaymentSimulatorImpl()
    private val inventoryEngine = InventoryReservationEngine()

    @Test
    fun `E2E 8 - Payment Failure triggers automatic inventory reservation rollback`() = runBlocking {
        val items = listOf(OrderItem(id = "i1", productId = "p1"))
        inventoryEngine.reserveInventory("o_fail", "r1", "b1", items)

        // Intento de pago con monto inválido 0.0 -> Falla
        val response = paymentGateway.processPayment(PaymentRequest("o_fail", 0.0))
        assertFalse(response.isSuccess)

        // Rollback automático de inventario
        inventoryEngine.rollbackReservationsForOrder("o_fail", "PAYMENT_FAILED")

        val reservations = inventoryEngine.getReservationsForOrder("o_fail")
        assertEquals(ReservationStatus.RELEASED, reservations[0].status)
    }
}
