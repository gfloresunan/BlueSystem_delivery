package com.example.eiam.domain.engine

import com.example.eiam.domain.model.*
import com.google.firebase.Timestamp
import java.util.UUID

/**
 * EIAM — BusinessEngine (FASE 6)
 * Separa Business de User. businessId es un UUID propio.
 * Un usuario puede tener N negocios mediante Memberships.
 */
object BusinessEngine {

    /**
     * Crea un nuevo Business con businessId UUID propio (NO UID del usuario).
     */
    fun createBusiness(
        ownerUid: String,
        name: String,
        legalName: String = name,
        taxId: String = "",
        cuisineType: String = "",
        currency: String = "NIO",
        timezone: String = "America/Managua"
    ): Business {
        val businessId = UUID.randomUUID().toString()
        return Business(
            businessId = businessId,
            ownerUid = ownerUid,
            name = name,
            legalName = legalName,
            taxId = taxId,
            cuisineType = cuisineType,
            currency = currency,
            timezone = timezone,
            status = AccountStatus.PENDING,
            createdAt = Timestamp.now(),
            updatedAt = Timestamp.now()
        )
    }

    /**
     * Crea la Membership OWNER automáticamente al registrar el negocio.
     */
    fun createOwnerMembership(business: Business): Membership =
        Membership(
            membershipId = UUID.randomUUID().toString(),
            uid = business.ownerUid,
            businessId = business.businessId,
            branchId = null,
            role = EiamRole.OWNER,
            status = AccountStatus.ACTIVE,
            invitedBy = business.ownerUid,
            invitedAt = business.createdAt,
            acceptedAt = business.createdAt,
            createdAt = business.createdAt,
            updatedAt = business.updatedAt
        )

    /**
     * Activa el negocio tras verificación.
     */
    fun activate(business: Business): Business =
        business.copy(
            status = AccountStatus.ACTIVE,
            isVerified = true,
            updatedAt = Timestamp.now()
        )

    /**
     * Suspende el negocio.
     */
    fun suspend(business: Business): Business =
        business.copy(
            status = AccountStatus.SUSPENDED,
            isVerified = false,
            updatedAt = Timestamp.now()
        )
}

/**
 * EIAM — LegacyBusinessAdapter (FASE 6)
 * Traduce el patrón legacy (UID == businessId) al nuevo modelo Business.
 * Los módulos frozen siguen funcionando sin cambios.
 */
object LegacyBusinessAdapter {

    /**
     * Obtiene el businessId correcto.
     * En el sistema legacy, businessId == uid del usuario.
     * En EIAM, businessId es un UUID propio.
     * Este adapter resuelve la transición.
     */
    fun resolveBusinessId(uid: String, eiamBusinessId: String?): String =
        if (!eiamBusinessId.isNullOrBlank()) eiamBusinessId else uid

    /**
     * Crea un Business mínimo desde los datos legacy de un usuario con rol "business".
     * Se usa durante la migración de datos.
     */
    fun fromLegacyUser(
        uid: String,
        displayName: String,
        email: String
    ): Business = Business(
        businessId = uid,                    // Durante migración: businessId == uid temporalmente
        ownerUid = uid,
        name = displayName,
        email = email,
        status = AccountStatus.ACTIVE,
        legacyUidBusinessId = uid,
        createdAt = Timestamp.now(),
        updatedAt = Timestamp.now()
    )
}
