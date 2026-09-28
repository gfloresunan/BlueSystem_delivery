package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/**
 * EIAM — Enterprise Identity & Access Management
 * Identity: Raíz del modelo de identidad canónico.
 * Contiene solo datos de autenticación (NO datos de perfil).
 *
 * Separación explícita: Identity ≠ Profile
 * - Identity: UID, email, providers, accountStatus (datos de Auth)
 * - Profile:  nombre, foto, direcciones, vehículo (datos de negocio)
 */
data class Identity(
    val uid: String = "",
    val email: String = "",
    val emailVerified: Boolean = false,
    val providers: List<AuthProvider> = emptyList(),
    val accountStatus: AccountStatus = AccountStatus.PENDING,
    val createdAt: Timestamp? = null,
    val lastLoginAt: Timestamp? = null,
    val deletedAt: Timestamp? = null
)

enum class AuthProvider {
    EMAIL_PASSWORD,
    GOOGLE,
    FACEBOOK,
    ANONYMOUS
}
