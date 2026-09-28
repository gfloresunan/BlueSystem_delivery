package com.example.domain.engine.order

data class PaymentRequest(
    val orderId: String,
    val amount: Double,
    val currency: String = "USD",
    val paymentMethod: String = "SIMULATOR"
)

data class PaymentResponse(
    val isSuccess: Boolean,
    val transactionId: String,
    val errorMessage: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Interfaz Desacoplada de Pasarela de Pagos (Hito 14 - Arquitectura Extensible).
 */
interface IPaymentGateway {
    suspend fun processPayment(request: PaymentRequest): PaymentResponse
    suspend fun refundPayment(transactionId: String, amount: Double): PaymentResponse
}

/**
 * Pasarela Simulada para Pruebas y Desarrollo (PaymentSimulator).
 */
class PaymentSimulatorImpl : IPaymentGateway {

    override suspend fun processPayment(request: PaymentRequest): PaymentResponse {
        if (request.amount <= 0.0) {
            return PaymentResponse(
                isSuccess = false,
                transactionId = "",
                errorMessage = "Monto de pago inválido (debe ser mayor a 0)"
            )
        }

        return PaymentResponse(
            isSuccess = true,
            transactionId = "tx_sim_${System.currentTimeMillis()}_${request.orderId}"
        )
    }

    override suspend fun refundPayment(transactionId: String, amount: Double): PaymentResponse {
        return PaymentResponse(
            isSuccess = true,
            transactionId = "ref_${System.currentTimeMillis()}_$transactionId"
        )
    }
}
