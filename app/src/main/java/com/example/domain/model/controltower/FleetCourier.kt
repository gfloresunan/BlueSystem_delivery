package com.example.domain.model.controltower

/**
 * Estado del Repartidor en la Flota del Mapa
 */
enum class FleetCourierStatus(val label: String) {
    AVAILABLE("Disponible"),
    ASSIGNED("Asignado"),
    PICKING_UP("Recogiendo en caja"),
    IN_TRANSIT("En ruta"),
    PAUSED("Pausado"),
    OFFLINE("Desconectado")
}

/**
 * Modelo de Repartidor para el Mapa Operacional de Flota (FleetCourier)
 */
data class FleetCourier(
    val courierId: String,
    val name: String,
    val photoUrl: String? = null,
    val status: FleetCourierStatus = FleetCourierStatus.AVAILABLE,
    val latitude: Double = 12.136389,
    val longitude: Double = -86.251389,
    val vehicleType: String = "Motocicleta",
    val currentSpeedKmH: Int = 32,
    val activeOrdersCount: Int = 0,
    val etaMinutes: Int = 6,
    val distanceKm: Double = 1.4,
    val batteryLevel: Int = 85,
    val rating: Double = 4.9,
    val connectedTimeMinutes: Int = 140
)
