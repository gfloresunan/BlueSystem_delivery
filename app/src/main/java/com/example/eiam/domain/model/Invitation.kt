package com.example.eiam.domain.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp

/**
 * EIAM — Invitation
 * Invitación multi-canal para onboarding de empleados al comercio.
 * Canales: Email, WhatsApp, QR, Código 6 dígitos, Deep Link.
 *
 * Colección Firestore: /invitations/{token}
 *
 * @Keep garantiza que R8/ProGuard no elimine este modelo en Release.
 */
@Keep
data class Invitation(
    val token: String = "",                // UUID v4 + timestamp hash
    val shortCode: String = "",            // Código de 6 dígitos alfanumérico
    val businessId: String = "",
    val branchId: String? = null,
    val role: EiamRole = EiamRole.CASHIER,
    val invitedEmail: String = "",
    val invitedPhone: String = "",
    val invitedBy: String = "",            // UID del OWNER/MANAGER
    val channels: List<InvitationChannel> = listOf(InvitationChannel.EMAIL),
    val status: InvitationStatus = InvitationStatus.PENDING,
    val deepLink: String = "",             // bluesystem://invite/{token}
    val qrPayload: String = "",            // Contenido del QR
    val createdAt: Timestamp? = null,
    val expiresAt: Timestamp? = null,      // Default: 48h desde creación
    val acceptedAt: Timestamp? = null,
    val acceptedByUid: String = "",
    val revokedAt: Timestamp? = null,
    val revokedBy: String = "",
    val revokedReason: String = ""
)

enum class InvitationChannel {
    EMAIL, WHATSAPP, SMS, QR, CODE, DEEP_LINK, TEMPORARY_LINK
}

enum class InvitationStatus {
    PENDING,    // Enviada, sin respuesta
    ACCEPTED,   // Aceptada por el empleado
    EXPIRED,    // Expiró sin ser aceptada
    REVOKED,    // Revocada por el OWNER
    CANCELLED   // Cancelada antes de enviar
}
