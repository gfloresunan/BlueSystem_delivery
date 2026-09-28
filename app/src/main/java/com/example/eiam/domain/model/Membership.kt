package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/**
 * EIAM — Membership
 * Relación entre un usuario y un negocio con su rol específico.
 * Un usuario puede tener N membresías → N negocios → N roles distintos.
 *
 * Modelo:
 *   User ──[*]──→ Membership ──[N:1]──→ Business
 *                    └── EiamRole
 *                    └── Permissions (overrides opcionales)
 *
 * Colección Firestore: /membership/{membershipId}
 */
data class Membership(
    val membershipId: String = "",
    val uid: String = "",                           // Firebase Auth UID del usuario
    val businessId: String = "",                    // UUID propio del negocio (NO UID del usuario)
    val branchId: String? = null,                   // Sucursal específica (null = acceso a todas)
    val role: EiamRole = EiamRole.CLIENT,
    val status: AccountStatus = AccountStatus.PENDING,
    val invitedBy: String = "",                     // UID del OWNER que invitó
    val invitedAt: Timestamp? = null,
    val acceptedAt: Timestamp? = null,
    val suspendedAt: Timestamp? = null,
    val suspendedReason: String = "",
    val permissions: List<String> = emptyList(),    // EiamAction overrides opcionales
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
