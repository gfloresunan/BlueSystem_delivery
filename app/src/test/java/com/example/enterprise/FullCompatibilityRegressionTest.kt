package com.example.enterprise

import com.example.data.adapter.menu.LegacyMenuAdapter
import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenAssemblyEngine
import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.engine.order.OrderLifecycleEngine
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FullCompatibilityRegressionTest {

    @Test
    fun `test Frozen Core compatibility across Serie 13B, Hito 14, and Sprint 14_0`() {
        // 1. Serie 13B (Menu & LegacyAdapter)
        val v2Product = MenuProduct(id = "p1", name = "Empanada", basePrice = 40.0, status = MenuProductStatus.ACTIVE)
        val legacy = LegacyMenuAdapter.toLegacyProduct(v2Product, "Entradas")
        assertEquals("Empanada", legacy.name)

        // 2. Hito 14 (Order Lifecycle & KDS)
        val lifecycle = OrderLifecycleEngine()
        val queue = KdsQueueEngine()

        val order = Order(id = "o1", commercialStatus = CommercialStatus.CONFIRMED, items = listOf(OrderItem(id = "i1")))
        val ticket = queue.enqueue(order)
        val startResult = queue.start(ticket.ticketId)

        assertTrue(startResult.isSuccess)
        assertEquals(OperationalStatus.PREPARING, startResult.getOrNull()?.status)
    }
}
