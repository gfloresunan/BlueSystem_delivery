package com.example.domain.engine.kds

data class DispatchAssignment(
    val orderId: String,
    val driverId: String,
    val driverName: String,
    val status: String = "ASSIGNED",
    val assignedAt: Long = System.currentTimeMillis()
)

/**
 * Interfaz Desacoplada de Integración con el Sistema de Despacho / Delivery (Hito 14).
 * Define los contratos para la futura integración del motor de reparto y seguimiento en tiempo real.
 */
interface IDispatchIntegration {
    suspend fun assignDriver(orderId: String, driverId: String): DispatchAssignment
    suspend fun driverAccepted(orderId: String, driverId: String): Boolean
    suspend fun pickedUp(orderId: String): Boolean
    suspend fun delivered(orderId: String): Boolean
}

/**
 * Implementación de prueba del contrato IDispatchIntegration.
 */
class DispatchIntegrationSimulatorImpl : IDispatchIntegration {

    private val assignments = mutableMapOf<String, DispatchAssignment>()

    override suspend fun assignDriver(orderId: String, driverId: String): DispatchAssignment {
        val assignment = DispatchAssignment(orderId = orderId, driverId = driverId, driverName = "Driver $driverId")
        assignments[orderId] = assignment
        return assignment
    }

    override suspend fun driverAccepted(orderId: String, driverId: String): Boolean = true
    override suspend fun pickedUp(orderId: String): Boolean = true
    override suspend fun delivered(orderId: String): Boolean = true
}
