package com.example.domain.model.courier

data class VehicleDocuments(
    val licensePlate: String = "",
    val registrationCardNumber: String = "",
    val expirationDateMs: Long = 0L,
    val isApproved: Boolean = true
)

data class VehicleInsurance(
    val policyNumber: String = "",
    val insurerName: String = "",
    val expirationDateMs: Long = 0L,
    val isValid: Boolean = true
)

data class VehicleMaintenanceLog(
    val logId: String = "",
    val odometerKm: Double = 0.0,
    val dateMs: Long = System.currentTimeMillis(),
    val serviceType: String = "", // E.g., "OIL_CHANGE", "TIRES_REPLACEMENT", "BRAKES_INSPECTION"
    val cost: Double = 0.0,
    val notes: String = ""
)

data class VehicleFuelLog(
    val logId: String = "",
    val odometerKm: Double = 0.0,
    val litersRefueled: Double = 0.0,
    val totalCost: Double = 0.0,
    val dateMs: Long = System.currentTimeMillis()
)

/**
 * Modelo integral del vehículo asignado al repartidor.
 */
data class Vehicle(
    val vehicleId: String = "",
    val assignedCourierId: String = "",
    val brand: String = "",
    val model: String = "",
    val year: Int = 2024,
    val color: String = "",
    val currentOdometerKm: Double = 0.0,
    val fuelType: String = "GASOLINE",
    val documents: VehicleDocuments = VehicleDocuments(),
    val insurance: VehicleInsurance = VehicleInsurance(),
    val maintenanceHistory: List<VehicleMaintenanceLog> = emptyList(),
    val fuelHistory: List<VehicleFuelLog> = emptyList()
) {
    val isRoadworthy: Boolean
        get() = documents.isApproved && insurance.isValid
}

/**
 * Valores del perfil y vehículo del motorizado (usado para OLD y NEW values).
 */
data class CourierProfileValues(
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val nationalId: String = "",
    val vehicleBrand: String = "",
    val vehicleModel: String = "",
    val vehiclePlate: String = "",
    val vehicleYear: Int = 2024,
    val vehicleColor: String = "",
    val department: String = "",
    val city: String = ""
)

/**
 * Referencia a documento digital adjunto en Storage.
 */
data class CourierDocumentRef(
    val name: String = "",
    val storagePath: String = "",
    val url: String = "",
    val contentType: String = "image/jpeg",
    val size: Long = 0L,
    val status: String = "VALID"
)

/**
 * Solicitud de Modificación de Perfil de Motorizado (/courier_profile_requests).
 */
data class CourierProfileRequest(
    val requestId: String = "",
    val courierId: String = "",
    val tenantId: String = "",
    val requestType: String = "VEHICLE_CHANGE", // VEHICLE_CHANGE, PERSONAL_DATA, FULL_PROFILE
    val status: String = "PENDING_REVIEW", // PENDING_REVIEW, APPROVED, REJECTED, CANCELLED
    val oldValues: CourierProfileValues = CourierProfileValues(),
    val newValues: CourierProfileValues = CourierProfileValues(),
    val documents: Map<String, CourierDocumentRef> = emptyMap(),
    val rejectionReason: String = "",
    val reviewedBy: String = "",
    val createdAtMs: Long = System.currentTimeMillis(),
    val updatedAtMs: Long = System.currentTimeMillis()
) {
    val isPending: Boolean
        get() = status.equals("PENDING_REVIEW", ignoreCase = true)

    val isApproved: Boolean
        get() = status.equals("APPROVED", ignoreCase = true)

    val isRejected: Boolean
        get() = status.equals("REJECTED", ignoreCase = true)
}

/**
 * Perfil oficial consolidado del motorizado.
 */
data class CourierOfficialProfile(
    val uid: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val nationalId: String = "",
    val department: String = "",
    val city: String = "",
    val vehicleBrand: String = "",
    val vehicleModel: String = "",
    val vehiclePlate: String = "",
    val vehicleYear: Int = 2024,
    val vehicleColor: String = "",
    val photoUrl: String = "",
    val isApproved: Boolean = true,
    val isActive: Boolean = true,
    val isAvailable: Boolean = false,
    val rating: Double = 5.0,
    val completedTripsCount: Int = 0,
    val completedCommerceTrips: Int = 0,
    val completedX2YTrips: Int = 0,
    val completedTotalTrips: Int = 0,
    val documents: Map<String, CourierDocumentRef> = emptyMap()
)

