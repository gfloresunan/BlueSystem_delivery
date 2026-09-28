package com.example.domain.engine.courier

import com.example.GeoUtils
import com.example.domain.model.courier.ApiConsumptionReason
import com.example.domain.model.courier.LocalEtaEstimate
import com.example.domain.model.courier.MapCostOptimizationPolicy
import com.example.domain.model.courier.RouteCacheEntry
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlin.math.min

/**
 * Motor Único Autorizado para Inteligencia de Mapas y Control de Presupuesto API (MapIntelligenceEngine).
 * Implementa la Map Cost Optimization Policy (Nivel 1: Local, Nivel 2: Event-Driven, Nivel 3: Caché).
 */
class MapIntelligenceEngine(
    private val policy: MapCostOptimizationPolicy = MapCostOptimizationPolicy()
) {

    private val _cachedRoute = MutableStateFlow<RouteCacheEntry?>(null)
    val cachedRoute: StateFlow<RouteCacheEntry?> = _cachedRoute.asStateFlow()

    private val _externalApiCallCount = MutableStateFlow(0)
    val externalApiCallCount: StateFlow<Int> = _externalApiCallCount.asStateFlow()

    private var recentSpeedsKmh = mutableListOf<Double>()

    // --- NIVEL 1: CÁLCULOS LOCALES (99% DEL TIEMPO, $0 COST) ---

    /**
     * Calcula la distancia Haversine en kilómetros entre dos coordenadas.
     */
    fun calculateLocalDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        return GeoUtils.calculateDistance(lat1, lon1, lat2, lon2)
    }

    /**
     * Calcula el rumbo (Bearing) en grados (0° - 360°) entre dos puntos.
     */
    fun calculateLocalBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        return GeoUtils.calculateBearing(lat1, lon1, lat2, lon2)
    }

    /**
     * Evalúa si una coordenada está dentro de la Geocerca local (por defecto 50 metros).
     */
    fun isWithinLocalGeofence(currentLat: Double, currentLon: Double, targetLat: Double, targetLon: Double, radiusMeters: Double = 50.0): Boolean {
        return GeoUtils.isWithinGeofence(currentLat, currentLon, targetLat, targetLon, radiusMeters)
    }

    /**
     * Calcula el ETA local basado en la distancia restante y velocidad reciente sin llamadas a la red.
     */
    fun calculateLocalEta(
        currentLat: Double,
        currentLon: Double,
        destLat: Double,
        destLon: Double,
        currentSpeedKmh: Double? = null
    ): LocalEtaEstimate {
        val remainingDistKm = calculateLocalDistanceKm(currentLat, currentLon, destLat, destLon)

        if (currentSpeedKmh != null && currentSpeedKmh > 5.0) {
            recentSpeedsKmh.add(currentSpeedKmh)
            if (recentSpeedsKmh.size > 10) recentSpeedsKmh.removeAt(0)
        }

        val avgSpeed = if (recentSpeedsKmh.isNotEmpty()) {
            recentSpeedsKmh.average()
        } else {
            policy.defaultLocalSpeedKmh
        }

        val hoursNeeded = (remainingDistKm / avgSpeed) * policy.localTrafficFactor
        val timeMinutes = hoursNeeded * 60.0

        return LocalEtaEstimate(
            remainingDistanceKm = remainingDistKm,
            estimatedSpeedKmh = avgSpeed,
            remainingTimeMinutes = timeMinutes,
            isLocallyCalculated = true
        )
    }

    // --- NIVEL 3: CACHÉ INTELIGENTE DE RUTAS Y POLILÍNEAS ---

    /**
     * Almacena una ruta en la caché inteligente.
     */
    fun cacheRoute(entry: RouteCacheEntry) {
        _cachedRoute.value = entry
    }

    /**
     * Obtiene los puntos de la polilínea cacheada si la ruta sigue siendo válida.
     */
    fun getValidCachedPolyline(destLat: Double, destLon: Double): List<LatLng>? {
        val cached = _cachedRoute.value ?: return null
        val distToDest = calculateLocalDistanceKm(cached.destinationLat, cached.destinationLng, destLat, destLon)
        if (distToDest > 0.05) { // Si el destino cambió en más de 50 metros
            return null
        }
        return cached.polylinePoints
    }

    // --- NIVEL 2: EVENT TRIGGER (DISPARADOR DE LLAMADAS EXTERNAS) ---

    /**
     * Evalúa si está justificada una consulta a Google Directions API según la política de costos.
     */
    fun shouldFetchExternalDirections(
        reason: ApiConsumptionReason,
        currentLat: Double,
        currentLon: Double,
        destLat: Double,
        destLon: Double
    ): Boolean {
        // Eventos explícitos de fase o usuario autorizan siempre (Nivel 2)
        if (reason in listOf(
                ApiConsumptionReason.ORDER_ACCEPTED,
                ApiConsumptionReason.PHASE_STORE_START,
                ApiConsumptionReason.PHASE_CUSTOMER_START,
                ApiConsumptionReason.MANUAL_USER_RECALC
            )
        ) {
            _externalApiCallCount.update { it + 1 }
            return true
        }

        // Verificación de desvío significativo (> 200m) frente a la ruta cacheada
        val cached = _cachedRoute.value
        if (cached != null) {
            val minDistanceToPolylineMeters = calculateMinDistanceToPolylineMeters(currentLat, currentLon, cached.polylinePoints)
            if (minDistanceToPolylineMeters > policy.maxAllowedDeviationMeters) {
                _externalApiCallCount.update { it + 1 }
                return true
            }
        }

        return false // Mantener resolución local (Nivel 1) o caché (Nivel 3)
    }

    /**
     * Calcula la distancia mínima en metros desde el punto GPS actual hasta el segmento más cercano de la Polyline cacheada.
     */
    private fun calculateMinDistanceToPolylineMeters(lat: Double, lon: Double, polyline: List<LatLng>): Double {
        if (polyline.isEmpty()) return Double.MAX_VALUE
        var minDistanceKm = Double.MAX_VALUE
        for (point in polyline) {
            val dist = calculateLocalDistanceKm(lat, lon, point.latitude, point.longitude)
            if (dist < minDistanceKm) {
                minDistanceKm = dist
            }
        }
        return minDistanceKm * 1000.0 // Convertir a metros
    }

    fun resetApiCounter() {
        _externalApiCallCount.value = 0
    }
}
