package com.example.kds

import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class InventoryReservationEngineTest {

    private val engine = InventoryReservationEngine()

    @Test
    fun `test reserveInventory creates HELD reservations with TTL`() {
        val items = listOf(OrderItem(id = "i1", productId = "p1", quantity = 2))
        val result = engine.reserveInventory(orderId = "o1", restaurantId = "r1", branchId = "b1", items = items, ttlMinutes = 15)

        assertTrue(result.isSuccess)
        val reservations = result.getOrNull() ?: emptyList()
        assertEquals(1, reservations.size)
        assertEquals(ReservationStatus.HELD, reservations[0].status)
        assertEquals(2, reservations[0].quantity)
    }

    @Test
    fun `test rollbackReservationsForOrder changes status to RELEASED`() {
        val items = listOf(OrderItem(id = "i1", productId = "p1", quantity = 2))
        engine.reserveInventory(orderId = "o1", restaurantId = "r1", branchId = "b1", items = items)

        val rollbackResult = engine.rollbackReservationsForOrder("o1", "USER_CANCELLED")
        assertTrue(rollbackResult.isSuccess)

        val reservations = engine.getReservationsForOrder("o1")
        assertEquals(1, reservations.size)
        assertEquals(ReservationStatus.RELEASED, reservations[0].status)
        assertEquals("USER_CANCELLED", reservations[0].releaseReason)
    }

    @Test
    fun `test checkAndCleanupExpiredReservations marks past TTL reservations as EXPIRED`() {
        val items = listOf(OrderItem(id = "i1", productId = "p1", quantity = 1))
        engine.reserveInventory(orderId = "o1", restaurantId = "r1", branchId = "b1", items = items, ttlMinutes = 10)

        // Simular tiempo futuro 11 minutos después
        val futureTime = System.currentTimeMillis() + (11L * 60L * 1000L)
        val expiredList = engine.checkAndCleanupExpiredReservations(futureTime)

        assertEquals(1, expiredList.size)
        assertEquals(ReservationStatus.EXPIRED, expiredList[0].status)
    }
}
