package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/**
 * EIAM — UserSession
 * Sesión activa de un usuario. Permite control de acceso, heartbeat y revocación remota.
 *
 * Colección Firestore: /sessions/{sessionId}
 */
data class UserSession(
    val sessionId: String = "",
    val uid: String = "",
    val deviceId: String = "",
    val deviceModel: String = "",
    val platform: String = "ANDROID",
    val appVersion: String = "",
    val ipAddress: String = "",
    val loginAt: Timestamp? = null,
    val lastSeenAt: Timestamp? = null,
    val expiresAt: Timestamp? = null,
    val isActive: Boolean = true,
    val revokedAt: Timestamp? = null,
    val revokedBy: String = "",
    val revokedReason: String = "",
    val businessId: String? = null,          // Si inició como usuario de comercio
    val role: EiamRole = EiamRole.CLIENT,
    val riskScore: Int = 100,                 // Score 0-100 (100 = seguro, < 50 = sospechoso)
    val requiresMfa: Boolean = false,         // Verdadero si la sesión requiere desafío MFA
    val isRiskApproved: Boolean = true
)

/**
 * EIAM — DeviceInfo
 * Dispositivo autorizado para un usuario con evaluación de riesgo de hardware (EIAM v2.1).
 *
 * Colección Firestore: /devices/{deviceId}
 */
data class DeviceInfo(
    val deviceId: String = "",
    val uid: String = "",
    val model: String = "",
    val manufacturer: String = "",
    val platform: String = "ANDROID",
    val osVersion: String = "",
    val appVersion: String = "",
    val fcmToken: String = "",
    val fingerprint: String = "",
    val status: DeviceStatus = DeviceStatus.AUTHORIZED,
    val authorizedAt: Timestamp? = null,
    val revokedAt: Timestamp? = null,
    val lastSeenAt: Timestamp? = null,
    // Device Risk & Trust Metrics (EIAM v2.1)
    val isRooted: Boolean = false,
    val isEmulator: Boolean = false,
    val isDeveloperMode: Boolean = false,
    val playIntegrityPassed: Boolean = true,
    val lastKnownIp: String = "",
    val trustLevel: Int = 100                 // 0-100 Nivel de Confianza
)

enum class DeviceStatus { AUTHORIZED, REVOKED, SUSPICIOUS }
