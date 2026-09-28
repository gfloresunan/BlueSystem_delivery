package com.example.domain.engine.courier

import com.example.domain.model.courier.RouteVersion
import com.example.domain.model.courier.RouteVersionHistory
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Métrica de calidad del trazado y ejecución de ruta.
 */
data class RouteQualityScore(
    val scorePercentage: Double = 100.0, // 0.0 a 100.0%
    val versionCount: Int = 1,
    val deviationCount: Int = 0,
    val isOptimal: Boolean = true
)

/**
 * Motor de calidad de rutas y versionado de trazados (RouteQualityEngine).
 */
class RouteQualityEngine {

    private val _history = MutableStateFlow(RouteVersionHistory())
    val history: StateFlow<RouteVersionHistory> = _history.asStateFlow()

    private var deviationCount = 0

    fun startRoute(orderId: String, initialPolyline: List<LatLng>, distanceKm: Double, durationMin: Double) {
        deviationCount = 0
        val v1 = RouteVersion(
            versionNumber = 1,
            polylinePoints = initialPolyline,
            distanceKm = distanceKm,
            durationMinutes = durationMin,
            reason = "Ruta Inicial v1 (Aceptación de Pedido)"
        )
        _history.value = RouteVersionHistory(orderId = orderId, versions = listOf(v1))
    }

    fun addRouteVersion(polyline: List<LatLng>, distanceKm: Double, durationMin: Double, reason: String): RouteVersion {
        deviationCount++
        val currentVersions = _history.value.versions
        val nextVersionNum = currentVersions.size + 1
        val newVersion = RouteVersion(
            versionNumber = nextVersionNum,
            polylinePoints = polyline,
            distanceKm = distanceKm,
            durationMinutes = durationMin,
            reason = reason
        )
        _history.update { it.copy(versions = currentVersions + newVersion) }
        return newVersion
    }

    fun calculateQualityScore(): RouteQualityScore {
        val versions = _history.value.versions
        val vCount = versions.size
        // Cada versión adicional (desvío/recálculo) descuenta 10% del score de calidad inicial
        val score = (100.0 - ((vCount - 1) * 10.0) - (deviationCount * 5.0)).coerceIn(0.0, 100.0)
        return RouteQualityScore(
            scorePercentage = score,
            versionCount = vCount,
            deviationCount = deviationCount,
            isOptimal = score >= 85.0
        )
    }
}
