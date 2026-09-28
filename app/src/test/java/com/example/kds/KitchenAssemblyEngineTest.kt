package com.example.kds

import com.example.domain.engine.kds.KitchenAssemblyEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KitchenAssemblyEngineTest {

    private val engine = KitchenAssemblyEngine()

    @Test
    fun `test assembly is incomplete when items are pending in stations`() {
        val order = Order(
            id = "o1",
            items = listOf(
                OrderItem(id = "i1", productName = "Burger", targetStation = KitchenStation.GRILL, isItemReady = true),
                OrderItem(id = "i2", productName = "Fries", targetStation = KitchenStation.FRYER, isItemReady = false)
            )
        )

        val status = engine.checkAssemblyCompleteness(order)

        assertFalse(status.isComplete)
        assertEquals(1, status.pendingStations.size)
        assertEquals(KitchenStation.FRYER, status.pendingStations[0])
    }

    @Test
    fun `test markItemAsReady transitions order to READY when all items are completed`() {
        val order = Order(
            id = "o1",
            items = listOf(
                OrderItem(id = "i1", productName = "Burger", targetStation = KitchenStation.GRILL, isItemReady = true),
                OrderItem(id = "i2", productName = "Fries", targetStation = KitchenStation.FRYER, isItemReady = false)
            )
        )

        val updatedOrder = engine.markItemAsReady(order, "i2")

        assertEquals(OperationalStatus.READY, updatedOrder.operationalStatus)
        assertTrue(updatedOrder.items.all { it.isItemReady })
    }
}
