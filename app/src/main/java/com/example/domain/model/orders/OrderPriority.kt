package com.example.domain.model.orders

/**
 * Nivel de Prioridad del Pedido (Order Priority Engine)
 */
enum class OrderPriority(val rank: Int, val label: String) {
    URGENT(1, "URGENTE ⚡"),
    VIP(2, "CLIENTE VIP 👑"),
    SLA_RISK(3, "RIESGO SLA ⏱️"),
    STANDARD(4, "ESTÁNDAR 📦")
}
