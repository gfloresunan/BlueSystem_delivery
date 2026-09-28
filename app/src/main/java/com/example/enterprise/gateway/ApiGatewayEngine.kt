package com.example.enterprise.gateway

enum class ApiProtocol {
    REST,
    GRAPHQL,
    WEBHOOK,
    INTERNAL_API,
    PUBLIC_API
}

data class GatewayRequest(
    val requestId: String = "req_${System.currentTimeMillis()}_${(1000..9999).random()}",
    val protocol: ApiProtocol,
    val endpoint: String,
    val authToken: String? = null,
    val payload: Map<String, Any> = emptyMap()
)

data class GatewayResponse(
    val requestId: String,
    val statusCode: Int,
    val isSuccess: Boolean,
    val responseData: Map<String, Any>
)

/**
 * Servidor Enterprise: ApiGatewayEngine.
 * Ruteador unificado de protocolos con Rate Limiting, Circuit Breaker y Autenticación.
 */
class ApiGatewayEngine(
    private val maxRequestsPerMinute: Int = 1000
) {

    private var requestCountWindow = 0
    private var isCircuitBreakerOpen = false

    fun processRequest(request: GatewayRequest): GatewayResponse {
        // 1. Verificación Circuit Breaker
        if (isCircuitBreakerOpen) {
            return GatewayResponse(
                requestId = request.requestId,
                statusCode = 503,
                isSuccess = false,
                responseData = mapOf("error" to "Circuit Breaker ABIERTO - Servicio temporalmente no disponible")
            )
        }

        // 2. Rate Limiting
        requestCountWindow++
        if (requestCountWindow > maxRequestsPerMinute) {
            return GatewayResponse(
                requestId = request.requestId,
                statusCode = 429,
                isSuccess = false,
                responseData = mapOf("error" to "Rate Limit Excedido")
            )
        }

        // 3. Autenticación para APIs Públicas / REST
        if ((request.protocol == ApiProtocol.PUBLIC_API || request.protocol == ApiProtocol.REST) && request.authToken.isNull_or_empty()) {
            return GatewayResponse(
                requestId = request.requestId,
                statusCode = 401,
                isSuccess = false,
                responseData = mapOf("error" to "Token de Autenticación Requerido")
            )
        }

        // 4. Ruteo Exitoso
        return GatewayResponse(
            requestId = request.requestId,
            statusCode = 200,
            isSuccess = true,
            responseData = mapOf(
                "protocol" to request.protocol.name,
                "endpoint" to request.endpoint,
                "processedAt" to System.currentTimeMillis()
            )
        )
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()

    fun triggerCircuitBreaker(open: Boolean) {
        isCircuitBreakerOpen = open
    }

    fun resetRateLimitWindow() {
        requestCountWindow = 0
    }
}
