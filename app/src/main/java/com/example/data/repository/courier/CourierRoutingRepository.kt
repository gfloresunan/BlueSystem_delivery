package com.example.data.repository.courier

import android.util.Log
import com.example.GeoUtils
import com.example.domain.engine.RealRoutingEngine
import com.example.domain.engine.navigation.StreetRoutingEngine
import com.example.domain.model.courier.CourierRoute
import com.example.domain.model.courier.CourierRoutePhase
import com.example.domain.model.courier.RoutingStatus
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/**
 * Repositorio de resolución vial de alta disponibilidad para Courier.
 * Implementa el protocolo BSD-COURIER-REAL-ROAD-ROUTING-ETA-001.
 * 
 * Salvaguardas operacionales:
 * 1. Cero coordenadas artificiales.
 * 2. Cero líneas rectas como fallback visual.
 * 3. Umbral único de desvío canónico: 200m y debounce de 30s.
 */
class CourierRoutingRepository {

    companion object {
        private const val TAG = "CourierRoutingRepo"
        const val MAX_ALLOWED_DEVIATION_METERS = 200.0
        const val RECALC_DEBOUNCE_MS = 30000L // 30 segundos

        private fun logD(tag: String, msg: String) {
            try { Log.d(tag, msg) } catch (_: Throwable) {}
        }
        private fun logW(tag: String, msg: String) {
            try { Log.w(tag, msg) } catch (_: Throwable) {}
        }
        private fun logI(tag: String, msg: String) {
            try { Log.i(tag, msg) } catch (_: Throwable) {}
        }
        private fun logE(tag: String, msg: String) {
            try { Log.e(tag, msg) } catch (_: Throwable) {}
        }

        /**
         * Decodificador canónico de Google Encoded Polyline Algorithm Format.
         * Pure Kotlin, sin dependencias externas, O(N).
         */
        fun decodePolyline(encoded: String): List<LatLng> {
            val poly = ArrayList<LatLng>()
            var index = 0
            val len = encoded.length
            var lat = 0
            var lng = 0

            try {
                while (index < len) {
                    var b: Int
                    var shift = 0
                    var result = 0
                    do {
                        b = encoded[index++].code - 63
                        result = result or ((b and 0x1f) shl shift)
                        shift += 5
                    } while (b >= 0x20)
                    val dlat = if ((result and 1) != 0) (result shr 1).inv() else (result shr 1)
                    lat += dlat

                    shift = 0
                    result = 0
                    do {
                        b = encoded[index++].code - 63
                        result = result or ((b and 0x1f) shl shift)
                        shift += 5
                    } while (b >= 0x20)
                    val dlng = if ((result and 1) != 0) (result shr 1).inv() else (result shr 1)
                    lng += dlng

                    val p = LatLng(lat.toDouble() / 1E5, lng.toDouble() / 1E5)
                    poly.add(p)
                }
            } catch (e: Exception) {
                logE(TAG, "Error decodificando polyline: ${e.message}")
            }
            return poly
        }
    }

    // Caché en memoria por clave determinística
    private val routeCache = ConcurrentHashMap<String, CourierRoute>()
    private var lastCalculatedTimeMs: Long = 0L

    /**
     * Valida si una coordenada es válida y está dentro de Nicaragua.
     */
    fun isValidCoordinate(coord: LatLng?): Boolean {
        if (coord == null) return false
        val lat = coord.latitude
        val lng = coord.longitude
        if (lat == 0.0 && lng == 0.0) return false
        if (lat.isNaN() || lng.isNaN()) return false
        return lat in 10.5..15.5 && lng in -88.0..-82.5
    }

    /**
     * Resuelve la ruta vial real por calles siguiendo la jerarquía autorizada:
     * Google Routes Callable -> OSRM Street Engine -> Última ruta válida en caché -> NO_ROUTE_AVAILABLE.
     */
    suspend fun resolveRoute(
        origin: LatLng,
        destination: LatLng,
        phase: CourierRoutePhase,
        forceRecalculate: Boolean = false
    ): Pair<RoutingStatus, CourierRoute?> = withContext(Dispatchers.IO) {
        if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
            logW(TAG, "Coordenadas inválidas detectadas: origin=$origin dest=$destination")
            return@withContext Pair(RoutingStatus.NO_VALID_COORDINATES, null)
        }

        val cacheKey = String.format(
            Locale.US,
            "%.4f,%.4f->%.4f,%.4f:%s",
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude,
            phase.name
        )

        val now = System.currentTimeMillis()

        // 1. Verificación en Caché si no es forzado
        if (!forceRecalculate) {
            val cached = routeCache[cacheKey]
            if (cached != null && (now - cached.calculatedAt) < 900000L) { // 15 min TTL
                logD(TAG, "Cache HIT para ruta: $cacheKey")
                return@withContext Pair(RoutingStatus.READY, cached)
            }
        }

        // 2. Intento Nivel 1: Backend Autoritativo (Google Routes API v2)
        try {
            val snapshot = RealRoutingEngine.resolveRealRoute(
                originLat = origin.latitude,
                originLng = origin.longitude,
                destLat = destination.latitude,
                destLng = destination.longitude,
                transportProfile = "TWO_WHEELER"
            )

            if (!snapshot.isFallback && snapshot.polyline.isNotBlank()) {
                val decodedPoints = decodePolyline(snapshot.polyline)
                if (decodedPoints.size >= 2) {
                    val route = CourierRoute(
                        phase = phase,
                        points = decodedPoints,
                        distanceMeters = snapshot.routeDistanceMeters.toInt(),
                        durationSeconds = snapshot.routeDurationSeconds.toInt(),
                        calculatedAt = now,
                        destination = destination,
                        provider = snapshot.routingProvider,
                        isFallback = false
                    )
                    routeCache[cacheKey] = route
                    lastCalculatedTimeMs = now
                    logD(TAG, "Ruta resuelta exitosamente vía ${snapshot.routingProvider}: ${route.distanceKm} km, ${route.durationMinutes} min")
                    return@withContext Pair(RoutingStatus.READY, route)
                }
            }
        } catch (e: Exception) {
            logW(TAG, "Fallo al consultar RealRoutingEngine: ${e.message}")
        }

        // 3. Intento Nivel 2: Motor de Calle Nativo (StreetRoutingEngine - OSRM)
        try {
            val streetPoints = StreetRoutingEngine.getRouteCoordinates(origin, destination)
            // Se valida que no sea fallback de línea recta de dos puntos devuelto por StreetRoutingEngine
            if (streetPoints.size > 2) {
                var totalDistMeters = 0.0
                for (i in 0 until streetPoints.size - 1) {
                    val p1 = streetPoints[i]
                    val p2 = streetPoints[i + 1]
                    totalDistMeters += GeoUtils.calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude) * 1000.0
                }
                val durationSec = ((totalDistMeters / 1000.0) * 144.0).toInt().coerceAtLeast(60) // ~25 km/h promedio
                val route = CourierRoute(
                    phase = phase,
                    points = streetPoints,
                    distanceMeters = totalDistMeters.toInt(),
                    durationSeconds = durationSec,
                    calculatedAt = now,
                    destination = destination,
                    provider = "STREET_ROUTING_OSRM",
                    isFallback = false
                )
                routeCache[cacheKey] = route
                lastCalculatedTimeMs = now
                logD(TAG, "Ruta resuelta exitosamente vía STREET_ROUTING_OSRM: ${route.distanceKm} km, ${route.durationMinutes} min")
                return@withContext Pair(RoutingStatus.READY, route)
            }
        } catch (e: Exception) {
            logW(TAG, "Fallo al consultar StreetRoutingEngine: ${e.message}")
        }

        // 4. Intento Nivel 3: Última ruta válida en caché para este destino
        val existingEntry = routeCache.values.firstOrNull {
            it.phase == phase &&
            GeoUtils.calculateDistance(it.destination.latitude, it.destination.longitude, destination.latitude, destination.longitude) < 0.05
        }
        if (existingEntry != null && existingEntry.points.size > 2) {
            logI(TAG, "Reutilizando última ruta válida cacheada para destino")
            return@withContext Pair(RoutingStatus.STALE, existingEntry)
        }

        // 5. Nivel 4 (Salvaguarda 2): CERO LÍNEAS RECTAS COMO RUTA DE CONDUCCIÓN
        logE(TAG, "No fue posible obtener ruta vial real. Entrando en estado NO_ROUTE_AVAILABLE.")
        return@withContext Pair(RoutingStatus.NO_ROUTE_AVAILABLE, null)
    }

    /**
     * Evalúa si la posición actual del motorizado se desvió significativamente (> 200m)
     * de la polilínea activa y si se ha cumplido el debounce de 30 segundos.
     */
    fun shouldRecalculateDueToDeviation(currentLocation: LatLng, activeRoute: CourierRoute?): Boolean {
        if (activeRoute == null || activeRoute.points.isEmpty()) return false
        val now = System.currentTimeMillis()
        val lastTime = maxOf(lastCalculatedTimeMs, activeRoute.calculatedAt)
        if ((now - lastTime) < RECALC_DEBOUNCE_MS) {
            return false // Debounce activo
        }

        val minDistanceMeters = calculateMinDistanceToPolylineMeters(currentLocation, activeRoute.points)
        val hasDeviated = minDistanceMeters > MAX_ALLOWED_DEVIATION_METERS

        if (hasDeviated) {
            logD(TAG, "DESVIO_DETECTADO: distancia=$minDistanceMeters m > umbral=$MAX_ALLOWED_DEVIATION_METERS m")
        }
        return hasDeviated
    }

    /**
     * Calcula la distancia mínima en metros desde un punto a cualquier segmento de la polyline.
     */
    fun calculateMinDistanceToPolylineMeters(point: LatLng, polyline: List<LatLng>): Double {
        if (polyline.isEmpty()) return Double.MAX_VALUE
        var minDistanceKm = Double.MAX_VALUE
        for (p in polyline) {
            val dist = GeoUtils.calculateDistance(point.latitude, point.longitude, p.latitude, p.longitude)
            if (dist < minDistanceKm) {
                minDistanceKm = dist
            }
        }
        return minDistanceKm * 1000.0
    }

    /**
     * Decodificador canónico de Google Encoded Polyline Algorithm Format.
     * Pure Kotlin, sin dependencias externas, O(N).
     */
    fun decodePolyline(encoded: String): List<LatLng> {
        val poly = ArrayList<LatLng>()
        var index = 0
        val len = encoded.length
        var lat = 0
        var lng = 0

        try {
            while (index < len) {
                var b: Int
                var shift = 0
                var result = 0
                do {
                    b = encoded[index++].code - 63
                    result = result or ((b and 0x1f) shl shift)
                    shift += 5
                } while (b >= 0x20)
                val dlat = if ((result and 1) != 0) (result shr 1).inv() else (result shr 1)
                lat += dlat

                shift = 0
                result = 0
                do {
                    b = encoded[index++].code - 63
                    result = result or ((b and 0x1f) shl shift)
                    shift += 5
                } while (b >= 0x20)
                val dlng = if ((result and 1) != 0) (result shr 1).inv() else (result shr 1)
                lng += dlng

                val p = LatLng(lat.toDouble() / 1E5, lng.toDouble() / 1E5)
                poly.add(p)
            }
        } catch (e: Exception) {
            logE(TAG, "Error decodificando polyline: ${e.message}")
        }
        return poly
    }
}
