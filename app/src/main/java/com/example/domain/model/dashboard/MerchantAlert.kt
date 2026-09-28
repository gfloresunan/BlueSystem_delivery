package com.example.domain.model.dashboard

enum class AlertSeverity {
    CRITICAL,  // 🔴 Rojo
    IMPORTANT, // 🟠 Naranja
    INFO       // 🔵 Azul
}

enum class AlertActionType {
    OPEN_PRODUCT,
    OPEN_ORDER,
    OPEN_PROMOTION,
    OPEN_KDS,
    PAUSE_STORE,
    REFRESH_STOCK
}

data class MerchantAlert(
    val id: String = "",
    val title: String = "",
    val message: String = "",
    val severity: AlertSeverity = AlertSeverity.INFO,
    val actionType: AlertActionType = AlertActionType.OPEN_PRODUCT,
    val targetId: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
