package com.example.eiam.domain.engine

import com.example.eiam.domain.model.*
import com.google.firebase.Timestamp
import java.util.UUID

/**
 * EIAM — MembershipEngine (FASE 6)
 * Gestiona la relación User ↔ Business ↔ Role.
 * Un usuario puede tener múltiples membresías en distintos negocios.
 */
object MembershipEngine {

    /**
     * Crea una Membership para un empleado invitado.
     */
    fun createFromInvitation(
        invitation: Invitation,
        acceptedByUid: String
    ): Membership = Membership(
        membershipId = UUID.randomUUID().toString(),
        uid = acceptedByUid,
        businessId = invitation.businessId,
        branchId = invitation.branchId,
        role = invitation.role,
        status = AccountStatus.ACTIVE,
        invitedBy = invitation.invitedBy,
        invitedAt = invitation.createdAt,
        acceptedAt = Timestamp.now(),
        createdAt = Timestamp.now(),
        updatedAt = Timestamp.now()
    )

    /**
     * Cambia el rol de una membresía.
     */
    fun changeRole(membership: Membership, newRole: EiamRole): Membership =
        membership.copy(
            role = newRole,
            updatedAt = Timestamp.now()
        )

    /**
     * Mueve al empleado a otra sucursal.
     */
    fun changeBranch(membership: Membership, newBranchId: String?): Membership =
        membership.copy(
            branchId = newBranchId,
            updatedAt = Timestamp.now()
        )

    /**
     * Suspende una membresía.
     */
    fun suspend(membership: Membership, reason: String): Membership =
        membership.copy(
            status = AccountStatus.SUSPENDED,
            suspendedAt = Timestamp.now(),
            suspendedReason = reason,
            updatedAt = Timestamp.now()
        )

    /**
     * Reactiva una membresía suspendida.
     */
    fun reactivate(membership: Membership): Membership =
        membership.copy(
            status = AccountStatus.ACTIVE,
            suspendedAt = null,
            suspendedReason = "",
            updatedAt = Timestamp.now()
        )

    /**
     * Termina una membresía (revoca acceso permanentemente).
     */
    fun terminate(membership: Membership): Membership =
        membership.copy(
            status = AccountStatus.TERMINATED,
            updatedAt = Timestamp.now()
        )

    /**
     * Verifica si el usuario tiene acceso activo al negocio.
     */
    fun hasActiveAccess(membership: Membership): Boolean =
        membership.status == AccountStatus.ACTIVE

    /**
     * Verifica si el usuario puede gestionar una sucursal específica.
     */
    fun canAccessBranch(membership: Membership, branchId: String): Boolean =
        membership.branchId == null || membership.branchId == branchId
}
