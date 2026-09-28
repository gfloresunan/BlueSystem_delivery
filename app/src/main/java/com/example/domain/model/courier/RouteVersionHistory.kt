package com.example.domain.model.courier

import com.google.android.gms.maps.model.LatLng

data class RouteVersion(
    val versionNumber: Int,
    val polylinePoints: List<LatLng>,
    val distanceKm: Double,
    val durationMinutes: Double,
    val reason: String,
    val timestampMs: Long = System.currentTimeMillis()
)

data class RouteVersionHistory(
    val orderId: String = "",
    val versions: List<RouteVersion> = emptyList()
) {
    val activeVersion: RouteVersion?
        get() = versions.lastOrNull()
}
