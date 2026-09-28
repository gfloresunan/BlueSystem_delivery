package com.example.orders

import com.example.Pedido
import com.example.domain.engine.orders.OrderPriorityEngine
import com.example.domain.model.orders.MerchantOrder
import com.example.domain.model.orders.OrderPriority
import org.junit.Assert.*
import org.junit.Test

class OrderPriorityEngineTest {

    @Test
    fun testVipCustomerPriorityAssignment() {
        val p = Pedido(pedidoId = "ord_001", customerName = "Juan Perez (VIP)", total = 2000.0)
        val mo = MerchantOrder(rawPedido = p, isVipCustomer = true)

        val priority = OrderPriorityEngine.determinePriority(mo)
        assertEquals(OrderPriority.VIP, priority)
    }
}
