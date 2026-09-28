package com.example.eiam.domain.model

/**
 * EIAM — AppUser Canónico (FASE 1)
 * Representa el usuario de la aplicación en el ecosistema EIAM.
 * Desacoplado de la identidad central para representar perfiles de plataforma y datos de sesión rápidos.
 */
data class AppUser(
    val uid: String,
    val email: String,
    val displayName: String?,
    val photoUrl: String?,
    val phoneNumber: String?,
    val activeRole: EiamRole = EiamRole.CLIENT,
    val activeBusinessId: String? = null,
    val activeBranchId: String? = null,
    val isActive: Boolean = true,
    val metadata: Map<String, String> = emptyMap()
)
