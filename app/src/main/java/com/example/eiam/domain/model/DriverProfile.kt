package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/** EIAM — DriverProfile (separado de Identity) */
data class DriverProfile(
    val uid: String = "",
    val displayName: String = "",
    val firstName: String = "",
    val lastName: String = "",
    val phone: String = "",
    val photoUrl: String = "",
    val nationalId: String = "",
    val licenseNumber: String = "",
    val licenseExpiresAt: Timestamp? = null,
    val vehicle: VehicleInfo = VehicleInfo(),
    val availability: DriverAvailability = DriverAvailability.OFFLINE,
    val currentLatitude: Double = 0.0,
    val currentLongitude: Double = 0.0,
    val assignedBranchId: String? = null,
    val totalDeliveries: Int = 0,
    val rating: Double = 5.0,
    val activeSessionId: String? = null,
    val isVerified: Boolean = false,
    val documents: List<DriverDocument> = emptyList(),
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class VehicleInfo(
    val brand: String = "",
    val model: String = "",
    val plate: String = "",
    val color: String = "",
    val type: VehicleType = VehicleType.MOTORCYCLE
)

enum class VehicleType { MOTORCYCLE, BICYCLE, CAR, SCOOTER }
enum class DriverAvailability { AVAILABLE, BUSY, OFFLINE }

data class DriverDocument(
    val type: String = "",         // "licencia", "soat", "identidad"
    val url: String = "",
    val verifiedAt: Timestamp? = null,
    val expiresAt: Timestamp? = null
)
