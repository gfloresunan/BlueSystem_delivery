package com.example.domain.model.courier

import com.google.android.gms.maps.model.LatLng

/**
 * Fases operacionales del trayecto de Courier (Commerce Delivery).
 * Independiente de la máquina de estados comercial de Firestore.
 */
enum class CourierRoutePhase {
    TO_MERCHANT,
    TO_CUSTOMER
}

/**
 * Estados conceptuales del ciclo de vida del routing en UI.
 */
enum class RoutingStatus {
    IDLE,
    CALCULATING,
    READY,
    UPDATING,
    STALE,
    ERROR,
    NO_ROUTE_AVAILABLE,
    NO_VALID_COORDINATES
}

/**
 * Control visual de presencia de tarjetas para maximización del mapa de navegación.
 */
enum class RouteCardVisibility {
    VISIBLE,
    COLLAPSED
}

/**
 * Modelo inmutable de la ruta vial activa calculada por el motor de routing.
 * Contiene únicamente información operacional para navegación y visualización.
 */
data class CourierRoute(
    val phase: CourierRoutePhase,
    val points: List<LatLng>,
    val distanceMeters: Int,
    val durationSeconds: Int,
    val calculatedAt: Long = System.currentTimeMillis(),
    val destination: LatLng,
    val provider: String = "GOOGLE_ROUTES_V2",
    val isFallback: Boolean = false
) {
    val distanceKm: Double
        get() = if (distanceMeters > 0) distanceMeters / 1000.0 else 0.0

    val durationMinutes: Int
        get() = if (durationSeconds > 0) (durationSeconds + 59) / 60 else 0
}
