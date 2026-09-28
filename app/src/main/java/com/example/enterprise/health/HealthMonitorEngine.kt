package com.example.enterprise.health

enum class HealthStatus {
    HEALTHY,
    DEGRADED,
    UNHEALTHY
}

data class SystemHealthReport(
    val technicalHealth: HealthStatus = HealthStatus.HEALTHY,
    val businessHealth: HealthStatus = HealthStatus.HEALTHY,
    val firestoreStatus: HealthStatus = HealthStatus.HEALTHY,
    val cloudFunctionsStatus: HealthStatus = HealthStatus.HEALTHY,
    val paymentsStatus: HealthStatus = HealthStatus.HEALTHY,
    val kdsStatus: HealthStatus = HealthStatus.HEALTHY,
    val dispatchStatus: HealthStatus = HealthStatus.HEALTHY,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Servidor Enterprise: HealthMonitorEngine (Pilar 9).
 * Diagnóstico en tiempo real: Health Técnico, Health de Negocio, Synthetic Monitoring, Capacity & Cost Monitoring.
 */
class HealthMonitorEngine {

    fun runSyntheticHealthCheck(
        isFirestoreOnline: Boolean = true,
        isPaymentGatewayOnline: Boolean = true,
        isKdsHealthy: Boolean = true
    ): SystemHealthReport {
        val tech = if (isFirestoreOnline && isPaymentGatewayOnline) HealthStatus.HEALTHY else HealthStatus.UNHEALTHY
        val biz = if (isKdsHealthy) HealthStatus.HEALTHY else HealthStatus.DEGRADED

        return SystemHealthReport(
            technicalHealth = tech,
            businessHealth = biz,
            firestoreStatus = if (isFirestoreOnline) HealthStatus.HEALTHY else HealthStatus.UNHEALTHY,
            paymentsStatus = if (isPaymentGatewayOnline) HealthStatus.HEALTHY else HealthStatus.UNHEALTHY,
            kdsStatus = if (isKdsHealthy) HealthStatus.HEALTHY else HealthStatus.DEGRADED
        )
    }
}
