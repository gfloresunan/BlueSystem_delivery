package com.example.domain.model.controltower

/**
 * Estado de Salud Operativo de Componentes Integrados (Health Monitor DCT)
 */
data class ControlTowerSystemHealth(
    val firestoreStatus: String = "🟢 Operativo",
    val gpsFleetStatus: String = "🟢 Activo (50 motorizados)",
    val kdsStatus: String = "🟢 Normal",
    val notificationsStatus: String = "🟢 Activas",
    val eventBusStatus: String = "🟢 Sincronizado",
    val overallStatusLabel: String = "🟢 OPERATIVO EN TIEMPO REAL"
)
