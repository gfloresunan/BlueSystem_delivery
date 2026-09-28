package com.example.enterprise.integration

import com.example.enterprise.gateway.ApiProtocol
import com.example.enterprise.gateway.ApiGatewayEngine
import com.example.enterprise.gateway.GatewayRequest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiGatewayEngineTest {

    private val gateway = ApiGatewayEngine(maxRequestsPerMinute = 5)

    @Test
    fun `test REST request without token returns 401 Unauthorized`() {
        val req = GatewayRequest(protocol = ApiProtocol.REST, endpoint = "/api/v2/orders")
        val res = gateway.processRequest(req)

        assertEquals(401, res.statusCode)
        assertFalse(res.isSuccess)
    }

    @Test
    fun `test REST request with token returns 200 Success`() {
        val req = GatewayRequest(protocol = ApiProtocol.REST, endpoint = "/api/v2/orders", authToken = "Bearer jwt_valid")
        val res = gateway.processRequest(req)

        assertEquals(200, res.statusCode)
        assertTrue(res.isSuccess)
    }

    @Test
    fun `test Circuit Breaker blocks requests when open`() {
        gateway.triggerCircuitBreaker(true)
        val req = GatewayRequest(protocol = ApiProtocol.INTERNAL_API, endpoint = "/internal/health")
        val res = gateway.processRequest(req)

        assertEquals(503, res.statusCode)
        assertFalse(res.isSuccess)
    }
}
