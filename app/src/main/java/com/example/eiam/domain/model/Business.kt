package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/**
 * EIAM — Business
 * Entidad separada del usuario. businessId es un UUID propio (NO el UID del usuario).
 * Permite que un usuario sea propietario de múltiples negocios.
 *
 * Flujo de registro:
 *   Usuario → Verifica Correo → Registrar Comercio → Business
 *   → Sucursal Principal → Owner → Restaurant Setup Wizard
 *
 * Colección Firestore: /businesses/{businessId}
 */
data class Business(
    val businessId: String = "",           // UUID propio generado por EIAM (NO el UID del usuario)
    val organizationId: String? = null,     // ID de la Organización matriz (opcional)
    val ownerUid: String = "",             // UID del propietario (Firebase Auth)
    val name: String = "",                 // Nombre del negocio
    val legalName: String = "",            // Razón social
    val taxId: String = "",                // RUC / NIT / CÉDULA JURÍDICA
    val cuisineType: String = "",          // Tipo de cocina
    val logoUrl: String = "",
    val bannerUrl: String = "",
    val phone: String = "",
    val email: String = "",
    val website: String = "",
    val currency: String = "NIO",          // NIO = Córdoba nicaragüense
    val timezone: String = "America/Managua",
    val status: AccountStatus = AccountStatus.PENDING,
    val isVerified: Boolean = false,
    val branchIds: List<String> = emptyList(),
    val primaryBranchId: String = "",
    val planTier: String = "FREE",         // FREE, BASIC, PRO, ENTERPRISE
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null,
    // Legacy compatibility field (uid == businessId en sistema anterior)
    val legacyUidBusinessId: String = ""
)
