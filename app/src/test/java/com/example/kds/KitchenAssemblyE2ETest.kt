package com.example.kds

import com.example.domain.engine.kds.KitchenAssemblyEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import org.junit.Assert.assertEquals
import org.junit.Test

class KitchenAssemblyE2ETest {

    private val assemblyEngine = KitchenAssemblyEngine()

    @Test
    fun `E2E 6 - Assembly Engine prevents READY status until all station items complete`() {
        val order = Order(
            id = "o_multi",
            items = listOf(
                OrderItem(id = "i1", productName = "Burger", targetStation = KitchenStation.GRILL, isItemReady = false),
                OrderItem(id = "i2", productName = "Fries", targetStation = KitchenStation.FRYER, isItemReady = false)
            )
        )

        // Marcar item 1 como listo -> Estado debe ser ASSEMBLING
        val step1 = assemblyEngine.markItemAsReady(order, "i1")
        assertEquals(OperationalStatus.ASSEMBLING, step1.operationalStatus)

        // Marcar item 2 como listo -> Estado debe pasar a READY
        val step2 = assemblyEngine.markItemAsReady(step1, "i2")
        assertEquals(OperationalStatus.READY, step2.operationalStatus)
    }
}
