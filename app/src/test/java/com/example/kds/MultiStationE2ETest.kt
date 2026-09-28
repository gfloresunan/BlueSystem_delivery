package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import org.junit.Assert.assertEquals
import org.junit.Test

class MultiStationE2ETest {

    private val queueEngine = KdsQueueEngine()

    @Test
    fun `E2E 7 - Multi-station routing splits order items to Grill, Fryer, and Drinks`() {
        val order = Order(
            id = "o_stations",
            restaurantId = "rest1",
            items = listOf(
                OrderItem(id = "i1", productName = "Steak", targetStation = KitchenStation.GRILL),
                OrderItem(id = "i2", productName = "Papas", targetStation = KitchenStation.FRYER),
                OrderItem(id = "i3", productName = "Soda", targetStation = KitchenStation.DRINKS)
            )
        )

        queueEngine.enqueue(order, KitchenStation.GRILL)
        queueEngine.enqueue(order, KitchenStation.FRYER)
        queueEngine.enqueue(order, KitchenStation.DRINKS)

        val grillQueue = queueEngine.getQueueByStation("rest1", KitchenStation.GRILL)
        val fryerQueue = queueEngine.getQueueByStation("rest1", KitchenStation.FRYER)
        val drinksQueue = queueEngine.getQueueByStation("rest1", KitchenStation.DRINKS)

        assertEquals(1, grillQueue.size)
        assertEquals(1, fryerQueue.size)
        assertEquals(1, drinksQueue.size)
    }
}
