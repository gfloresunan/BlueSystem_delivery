package com.example.domain.model.courier

import com.google.android.gms.maps.model.LatLng

/**
 * Razones válidas para autorizar una llamada externa a Google Directions API (Nivel 2).
 */
enum class ApiConsumptionReason {
    /** Pedido recién aceptado por el motorizado */
    ORDER_ACCEPTED,

    /** Inicio del trayecto activo hacia el comercio (Fase 1) */
    PHASE_STORE_START,

    /** Inicio del trayecto activo hacia el cliente (Fase 2) */
    PHASE_CUSTOMER_START,

    /** Desvío significativo de la ruta cacheada (> 200 metros) */
    PATH_DEVIATION_DETECTED,

    /** Solicitud manual explícita de recálculo por parte del usuario */
    MANUAL_USER_RECALC
}

/**
 * Entrada en la caché inteligente de rutas y polilíneas (Nivel 3).
 */
data class RouteCacheEntry(
    val routeId: String = "",
    val originLat: Double = 0.0,
    val originLng: Double = 0.0,
    val destinationLat: Double = 0.0,
    val destinationLng: Double = 0.0,
    val polylinePoints: List<LatLng> = emptyList(),
    val distanceKm: Double = 0.0,
    val durationMinutes: Double = 0.0,
    val cachedTimestampMs: Long = System.currentTimeMillis()
)

/**
 * Resultado del cálculo de ETA local sin llamadas a API externa (Nivel 1).
 */
data class LocalEtaEstimate(
    val remainingDistanceKm: Double = 0.0,
    val estimatedSpeedKmh: Double = 30.0,
    val remainingTimeMinutes: Double = 0.0,
    val isLocallyCalculated: Boolean = true
)

/**
 * Política global de optimización de costos de mapa (Map Cost Optimization Policy).
 */
data class MapCostOptimizationPolicy(
    val maxAllowedDeviationMeters: Double = 200.0,
    val cacheTtlMs: Long = 1800000L, // 30 minutos
    val defaultLocalSpeedKmh: Double = 30.0,
    val localTrafficFactor: Double = 1.15 // Factor de ajuste por tráfico local
)
