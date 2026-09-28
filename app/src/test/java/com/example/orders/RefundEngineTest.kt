package com.example.orders

import com.example.domain.model.orders.OrderRefund
import com.example.domain.model.orders.RefundStatus
import com.example.domain.model.orders.RefundType
import org.junit.Assert.*
import org.junit.Test

class RefundEngineTest {

    @Test
    fun testRefundCreationIntegrity() {
        val refund = OrderRefund(
            id = "ref_001",
            orderId = "ord_001",
            type = RefundType.TOTAL,
            amount = 450.0,
            reason = "Producto entregado frío"
        )

        assertEquals("ref_001", refund.id)
        assertEquals(RefundStatus.APPROVED, refund.status)
    }
}
