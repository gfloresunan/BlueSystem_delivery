package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/** EIAM — AdminProfile (separado de Identity) */
data class AdminProfile(
    val uid: String = "",
    val displayName: String = "",
    val email: String = "",
    val photoUrl: String = "",
    val adminLevel: AdminLevel = AdminLevel.SUPPORT,
    val managedTenants: List<String> = emptyList(),   // businessIds bajo su supervisión
    val authorizedActions: List<String> = emptyList(), // EiamAction overrides
    val department: String = "",
    val employeeCode: String = "",
    val createdAt: Timestamp? = null,
    val lastAuditAt: Timestamp? = null
)

enum class AdminLevel {
    SUPER_ADMIN,  // Acceso total a la plataforma
    ADMIN,        // Gestión de comercios y usuarios
    AUDITOR,      // Solo lectura y auditoría
    SUPPORT       // Soporte a usuarios y comercios
}
