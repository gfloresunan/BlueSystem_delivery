package com.example.enterprise.integration

import com.example.enterprise.gateway.ApiGatewayEngine
import com.example.enterprise.gateway.ApiProtocol
import com.example.enterprise.gateway.GatewayRequest
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Sprint14_2E2ETest {

    private val hub = IntegrationHub()
    private val gateway = ApiGatewayEngine()

    @Test
    fun `E2E Sprint 14_2 - Full Integration Platform & API Gateway Validation`() = runBlocking {
        // 1. Petición entrante via API Gateway
        val req = GatewayRequest(
            protocol = ApiProtocol.WEBHOOK,
            endpoint = "/webhooks/order-status",
            payload = mapOf("orderId" to "o999", "status" to "DELIVERED")
        )
        val gatewayRes = gateway.processRequest(req)
        assertTrue(gatewayRes.isSuccess)

        // 2. Transmisión a conectores externos de comunicación y analítica
        val waRes = hub.dispatchExternalAction("conn_whatsapp", "NOTIFY", mapOf("text" to "Su pedido ha sido entregado"))
        assertTrue(waRes.isSuccess)

        val biRes = hub.dispatchExternalAction("conn_powerbi_looker", "PUSH_METRIC", mapOf("rowCount" to 1))
        assertTrue(biRes.isSuccess)

        val zapRes = hub.dispatchExternalAction("conn_zapier_webhook", "TRIGGER", mapOf("event" to "OrderDelivered"))
        assertTrue(zapRes.isSuccess)
    }
}
