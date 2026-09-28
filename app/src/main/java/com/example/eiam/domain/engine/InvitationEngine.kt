package com.example.eiam.domain.engine

import com.example.eiam.domain.model.*
import com.google.firebase.Timestamp
import java.util.UUID

/**
 * EIAM — InvitationEngine
 * Motor de invitaciones multi-canal para onboarding de empleados.
 *
 * Canales: Email, WhatsApp, QR, Código 6 dígitos, Deep Link.
 * Expiración: 48h por defecto (configurable).
 * Revocación: atómica mediante transacción Firestore.
 */
object InvitationEngine {

    private const val DEEP_LINK_BASE = "bluesystem://invite/"
    private const val DEFAULT_EXPIRY_HOURS = 48L
    private val CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Sin caracteres ambiguos

    /**
     * Genera una nueva invitación.
     */
    fun createInvitation(
        businessId: String,
        branchId: String? = null,
        role: EiamRole,
        invitedEmail: String = "",
        invitedPhone: String = "",
        invitedBy: String,
        channels: List<InvitationChannel> = listOf(InvitationChannel.EMAIL),
        expiryHours: Long = DEFAULT_EXPIRY_HOURS
    ): Invitation {
        val token = generateToken()
        val shortCode = generateShortCode()
        val now = Timestamp.now()
        val expiresAt = Timestamp(now.seconds + (expiryHours * 3600), 0)

        return Invitation(
            token = token,
            shortCode = shortCode,
            businessId = businessId,
            branchId = branchId,
            role = role,
            invitedEmail = invitedEmail,
            invitedPhone = invitedPhone,
            invitedBy = invitedBy,
            channels = channels,
            status = InvitationStatus.PENDING,
            deepLink = "$DEEP_LINK_BASE$token",
            qrPayload = "$DEEP_LINK_BASE$token",
            createdAt = now,
            expiresAt = expiresAt
        )
    }

    /**
     * Valida si una invitación puede ser aceptada.
     */
    fun validateForAcceptance(invitation: Invitation): InvitationValidationResult {
        val now = Timestamp.now()
        return when {
            invitation.status == InvitationStatus.REVOKED ->
                InvitationValidationResult.REVOKED
            invitation.status == InvitationStatus.ACCEPTED ->
                InvitationValidationResult.ALREADY_ACCEPTED
            invitation.status == InvitationStatus.EXPIRED ->
                InvitationValidationResult.EXPIRED
            invitation.expiresAt != null && now.seconds > invitation.expiresAt.seconds ->
                InvitationValidationResult.EXPIRED
            else ->
                InvitationValidationResult.VALID
        }
    }

    /**
     * Marca la invitación como aceptada.
     */
    fun accept(invitation: Invitation, acceptedByUid: String): Invitation =
        invitation.copy(
            status = InvitationStatus.ACCEPTED,
            acceptedAt = Timestamp.now(),
            acceptedByUid = acceptedByUid
        )

    /**
     * Revoca una invitación.
     */
    fun revoke(invitation: Invitation, revokedBy: String, reason: String): Invitation =
        invitation.copy(
            status = InvitationStatus.REVOKED,
            revokedAt = Timestamp.now(),
            revokedBy = revokedBy,
            revokedReason = reason
        )

    /**
     * Marca invitaciones expiradas (llamar en batch).
     */
    fun markAsExpired(invitation: Invitation): Invitation =
        invitation.copy(status = InvitationStatus.EXPIRED)

    fun isExpired(invitation: Invitation): Boolean {
        val now = Timestamp.now()
        return invitation.expiresAt != null && now.seconds > invitation.expiresAt.seconds
    }

    // ─── Generadores ───────────────────────────────────────────────────────

    private fun generateToken(): String = UUID.randomUUID().toString().replace("-", "")

    private fun generateShortCode(): String =
        (1..6).map { CODE_CHARS.random() }.joinToString("")
}

enum class InvitationValidationResult {
    VALID, EXPIRED, REVOKED, ALREADY_ACCEPTED, NOT_FOUND
}
