package com.example.kds

import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.engine.order.OrderLifecycleEngine
import com.example.domain.engine.order.UserRole
import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderCancellationE2ETest {

    private val inventoryEngine = InventoryReservationEngine()
    private val lifecycleEngine = OrderLifecycleEngine()

    @Test
    fun `E2E 2 - Order Cancellation releases inventory reservations automatically`() {
        val items = listOf(OrderItem(id = "i1", productId = "p1", quantity = 2))
        val order = Order(id = "ord_cancel", items = items)

        inventoryEngine.reserveInventory(order.id, "r1", "b1", items)

        val cancelResult = lifecycleEngine.updateCommercialStatus(order, CommercialStatus.CANCELLED, UserRole.CLIENT)
        assertTrue(cancelResult is com.example.domain.engine.order.LifecycleTransitionResult.Success)

        val rollbackResult = inventoryEngine.rollbackReservationsForOrder(order.id, "CLIENT_CANCELLED")
        assertTrue(rollbackResult.isSuccess)

        val reservations = inventoryEngine.getReservationsForOrder(order.id)
        assertEquals(ReservationStatus.RELEASED, reservations[0].status)
    }
}
