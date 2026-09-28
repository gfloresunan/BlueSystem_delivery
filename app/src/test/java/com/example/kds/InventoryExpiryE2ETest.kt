package com.example.kds

import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class InventoryExpiryE2ETest {

    private val inventoryEngine = InventoryReservationEngine()

    @Test
    fun `E2E 3 - Inventory TTL Expiry releases unconfirmed reservation`() {
        val items = listOf(OrderItem(id = "i1", productId = "p1", quantity = 1))
        inventoryEngine.reserveInventory(orderId = "ord_ttl", restaurantId = "r1", branchId = "b1", items = items, ttlMinutes = 15)

        // Simular transcurso de 16 minutos sin pago/confirmación
        val pastTTLTime = System.currentTimeMillis() + (16L * 60L * 1000L)
        val expired = inventoryEngine.checkAndCleanupExpiredReservations(pastTTLTime)

        assertEquals(1, expired.size)
        assertEquals(ReservationStatus.EXPIRED, expired[0].status)
    }
}
