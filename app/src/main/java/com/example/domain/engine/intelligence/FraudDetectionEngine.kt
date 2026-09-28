package com.example.domain.engine.intelligence

import com.example.Pedido

data class FraudAlert(
    val userId: String,
    val alertType: String,
    val severity: String, // LOW, MEDIUM, HIGH
    val description: String
)

object FraudDetectionEngine {

    /**
     * Evalúa el riesgo de fraude en un intento de pedido.
     */
    fun evaluateOrderRisk(
        userId: String,
        subtotal: Double,
        recentOrdersCountLast10Min: Int,
        couponCodeUsed: String?
    ): FraudAlert? {
        // 1. Detección de pedidos repetitivos sospechosos (>3 en 10 minutos)
        if (recentOrdersCountLast10Min >= 3) {
            return FraudAlert(
                userId = userId,
                alertType = "RAPID_ORDER_SPIKE",
                severity = "HIGH",
                description = "Se detectaron $recentOrdersCountLast10Min pedidos en menos de 10 minutos."
            )
        }

        // 2. Montos anómalos exagerados
        if (subtotal > 15000.0) {
            return FraudAlert(
                userId = userId,
                alertType = "ANOMALOUS_HIGH_AMOUNT",
                severity = "MEDIUM",
                description = "Pedido inusualmente alto por C$ $subtotal."
            )
        }

        return null
    }
}
