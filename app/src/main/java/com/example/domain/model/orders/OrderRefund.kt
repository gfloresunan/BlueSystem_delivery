package com.example.domain.model.orders

/**
 * Modelo de Reembolsos de Pedido (Centro de Reembolsos MOOC)
 */
enum class RefundType {
    PARTIAL,
    TOTAL
}

enum class RefundStatus {
    PENDING,
    APPROVED,
    REJECTED,
    PROCESSED
}

data class OrderRefund(
    val id: String = "",
    val orderId: String = "",
    val type: RefundType = RefundType.TOTAL,
    val amount: Double = 0.0,
    val reason: String = "",
    val status: RefundStatus = RefundStatus.APPROVED,
    val approvedBy: String = "Comercio Admin",
    val createdAtMs: Long = System.currentTimeMillis()
)
