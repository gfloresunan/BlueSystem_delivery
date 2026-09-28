package com.example.eiam.domain.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp

/**
 * EIAM — IdentityEvent (Identity Timeline)
 * Registro inmutable de eventos de identidad de un usuario.
 * Proporciona una línea de tiempo completa de la vida del usuario en la plataforma.
 *
 * Colección Firestore: /audit_events/{eventId}
 *
 * @Keep garantiza que R8/ProGuard no elimine este modelo en Release.
 */
@Keep
data class IdentityEvent(
    val eventId: String = "",
    val uid: String = "",                  // Usuario afectado
    val actorUid: String = "",             // Usuario que realizó la acción (puede ser self o admin)
    val eventType: IdentityEventType = IdentityEventType.ACCOUNT_CREATED,
    val businessId: String? = null,
    val branchId: String? = null,
    val previousValue: String? = null,     // Valor anterior (ej. rol anterior)
    val newValue: String? = null,          // Valor nuevo (ej. rol nuevo)
    val reason: String = "",
    val metadata: Map<String, Any> = emptyMap(),
    val occurredAt: Timestamp? = null,
    val ipAddress: String = "",
    val deviceId: String = "",
    val platform: String = "ANDROID"
)

enum class IdentityEventType {
    // Cuenta
    ACCOUNT_CREATED,
    EMAIL_VERIFIED,
    SOCIAL_LINKED,
    SOCIAL_UNLINKED,
    ACCOUNT_SUSPENDED,
    ACCOUNT_REACTIVATED,
    ACCOUNT_TERMINATED,
    PASSWORD_CHANGED,

    // Roles y permisos
    ROLE_ASSIGNED,
    ROLE_CHANGED,
    PERMISSION_GRANTED,
    PERMISSION_REVOKED,

    // Negocio
    BUSINESS_REGISTERED,
    BUSINESS_UPDATED,
    BRANCH_ASSIGNED,
    BRANCH_REMOVED,

    // Empleados
    EMPLOYEE_CREATED,
    EMPLOYEE_ROLE_CHANGED,
    EMPLOYEE_SUSPENDED,
    EMPLOYEE_REACTIVATED,
    EMPLOYEE_REMOVED,

    // Invitaciones
    INVITATION_SENT,
    INVITATION_ACCEPTED,
    INVITATION_REVOKED,
    INVITATION_EXPIRED,

    // Sesiones
    SESSION_STARTED,
    SESSION_ENDED,
    SESSION_REVOKED,

    // Dispositivos
    DEVICE_AUTHORIZED,
    DEVICE_REVOKED,
    DEVICE_SUSPICIOUS,

    // Claims y tenant
    CLAIM_UPDATED,
    TENANT_CHANGED,

    // Auditoría
    PERMISSION_DENIED,
    SUSPICIOUS_ACTIVITY
}
