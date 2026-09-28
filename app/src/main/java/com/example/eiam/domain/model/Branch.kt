package com.example.eiam.domain.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp

/**
 * EIAM — Branch
 * Sucursal como entidad Firestore independiente.
 * Un Business puede tener N sucursales. Cada sucursal puede tener N empleados.
 *
 * Colección Firestore: /branches/{branchId}
 *
 * @Keep garantiza que R8/ProGuard no elimine este modelo en Release.
 */
@Keep
data class Branch(
    val branchId: String = "",
    val businessId: String = "",           // Referencia al negocio propietario
    val name: String = "",
    val address: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val phone: String = "",
    val email: String = "",
    val deliveryRadiusKm: Double = 5.0,
    val deliveryFee: Double = 0.0,
    val minimumOrder: Double = 0.0,
    val prepTimeMinutes: Int = 20,
    val isOpen: Boolean = true,
    val isPrimary: Boolean = false,
    val status: AccountStatus = AccountStatus.ACTIVE,
    val employeeIds: List<String> = emptyList(),
    val kdsStations: List<String> = emptyList(),
    val weeklySchedule: Map<String, Any> = emptyMap(),
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null,
    val tenantId: String = "",
    val departmentId: String = "",
    val departmentName: String = "",
    val municipalityId: String = "",
    val municipalityName: String = "",
    val cityId: String = "",
    val city: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val location: Map<String, Any>? = null,
    val coordenadas: Map<String, Any>? = null
) {
    fun getEffectiveLatitude(): Double {
        if (latitude in -90.0..90.0 && latitude != 0.0) return latitude
        if (lat in -90.0..90.0 && lat != 0.0) return lat
        val locLat = (location?.get("latitude") as? Number)?.toDouble()
            ?: (location?.get("_latitude") as? Number)?.toDouble()
            ?: (location?.get("lat") as? Number)?.toDouble()
        if (locLat != null && locLat in -90.0..90.0 && locLat != 0.0) return locLat
        val coordLat = (coordenadas?.get("latitud") as? Number)?.toDouble()
            ?: (coordenadas?.get("lat") as? Number)?.toDouble()
            ?: (coordenadas?.get("latitude") as? Number)?.toDouble()
        if (coordLat != null && coordLat in -90.0..90.0 && coordLat != 0.0) return coordLat
        return 0.0
    }

    fun getEffectiveLongitude(): Double {
        if (longitude in -180.0..180.0 && longitude != 0.0) return longitude
        if (lng in -180.0..180.0 && lng != 0.0) return lng
        val locLng = (location?.get("longitude") as? Number)?.toDouble()
            ?: (location?.get("_longitude") as? Number)?.toDouble()
            ?: (location?.get("lng") as? Number)?.toDouble()
        if (locLng != null && locLng in -180.0..180.0 && locLng != 0.0) return locLng
        val coordLng = (coordenadas?.get("longitud") as? Number)?.toDouble()
            ?: (coordenadas?.get("lng") as? Number)?.toDouble()
            ?: (coordenadas?.get("longitude") as? Number)?.toDouble()
        if (coordLng != null && coordLng in -180.0..180.0 && coordLng != 0.0) return coordLng
        return 0.0
    }

    fun hasValidCoordinates(): Boolean {
        val latVal = getEffectiveLatitude()
        val lngVal = getEffectiveLongitude()
        return latVal != 0.0 && lngVal != 0.0 && latVal in -90.0..90.0 && lngVal in -180.0..180.0 && !latVal.isNaN() && !lngVal.isNaN()
    }

    fun isCurrentlyOpen(timezone: String = "America/Managua", parentSchedule: Map<String, Any>? = null): Boolean {
        val effectiveSchedule = if (weeklySchedule.isNotEmpty()) weeklySchedule else (parentSchedule ?: emptyMap())
        return com.example.domain.engine.business.OperatingHoursResolver.isStoreOpen(
            schedule = effectiveSchedule,
            manualOpen = isOpen,
            timezone = timezone
        )
    }
}
