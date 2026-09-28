package com.example.kds

import com.example.domain.engine.order.PaymentRequest
import com.example.domain.engine.order.PaymentSimulatorImpl
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PaymentGatewayTest {

    private val gateway = PaymentSimulatorImpl()

    @Test
    fun `test processPayment returns success for positive amount`() = runBlocking {
        val request = PaymentRequest(orderId = "o1", amount = 150.0)
        val response = gateway.processPayment(request)

        assertTrue(response.isSuccess)
        assertTrue(response.transactionId.startsWith("tx_sim_"))
    }

    @Test
    fun `test processPayment fails for zero or negative amount`() = runBlocking {
        val request = PaymentRequest(orderId = "o1", amount = 0.0)
        val response = gateway.processPayment(request)

        assertFalse(response.isSuccess)
        assertEquals("Monto de pago inválido (debe ser mayor a 0)", response.errorMessage)
    }

    @Test
    fun `test refundPayment returns refund transaction id`() = runBlocking {
        val response = gateway.refundPayment("tx_sim_123", 150.0)
        assertTrue(response.isSuccess)
        assertTrue(response.transactionId.startsWith("ref_"))
    }
}
