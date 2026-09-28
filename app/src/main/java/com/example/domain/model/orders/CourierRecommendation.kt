package com.example.domain.model.orders

/**
 * Modelo de Recomendación de Motorizado en Modo Inteligente (Smart Courier Assignment)
 */
data class CourierRecommendation(
    val courierId: String,
    val courierName: String,
    val vehicleType: String = "Motocicleta",
    val distanceKm: Double = 1.2,
    val etaMinutes: Int = 5,
    val score: Int = 95, // 0 - 100
    val activeOrdersCount: Int = 0,
    val rating: Double = 4.9,
    val batteryLevel: Int = 88,
    val isRecommended: Boolean = false,
    val recommendationReason: String = "Distancia óptima y baja carga de trabajo"
)
