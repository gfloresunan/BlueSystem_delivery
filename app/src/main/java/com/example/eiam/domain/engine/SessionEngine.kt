package com.example.eiam.domain.engine

import com.example.eiam.domain.model.*
import com.google.firebase.Timestamp
import java.util.UUID

/**
 * EIAM — SessionEngine (FASE 8)
 * Gestiona sesiones activas: login, logout, heartbeat, revocación.
 */
object SessionEngine {

    private const val SESSION_TTL_HOURS = 24 * 7L // 7 días

    fun createSession(
        uid: String,
        deviceId: String,
        deviceModel: String,
        appVersion: String,
        role: EiamRole,
        businessId: String? = null,
        platform: String = "ANDROID",
        deviceInfo: DeviceInfo? = null,
        ipAddress: String = ""
    ): UserSession {
        val now = Timestamp.now()
        val assessment = deviceInfo?.let { DeviceRiskEngine.evaluateDeviceRisk(it, ipAddress) }
        val calculatedRiskScore = assessment?.trustScore ?: 100
        val requiresMfa = calculatedRiskScore < 50

        return UserSession(
            sessionId = UUID.randomUUID().toString(),
            uid = uid,
            deviceId = deviceId,
            deviceModel = deviceModel,
            platform = platform,
            appVersion = appVersion,
            ipAddress = ipAddress,
            loginAt = now,
            lastSeenAt = now,
            expiresAt = Timestamp(now.seconds + (SESSION_TTL_HOURS * 3600), 0),
            isActive = true,
            role = role,
            businessId = businessId,
            riskScore = calculatedRiskScore,
            requiresMfa = requiresMfa,
            isRiskApproved = !requiresMfa
        )
    }

    fun heartbeat(session: UserSession): UserSession =
        session.copy(lastSeenAt = Timestamp.now())

    fun end(session: UserSession): UserSession =
        session.copy(isActive = false, lastSeenAt = Timestamp.now())

    fun revoke(session: UserSession, revokedBy: String, reason: String): UserSession =
        session.copy(
            isActive = false,
            revokedAt = Timestamp.now(),
            revokedBy = revokedBy,
            revokedReason = reason
        )

    fun isExpired(session: UserSession): Boolean {
        val now = Timestamp.now()
        return session.expiresAt != null && now.seconds > session.expiresAt.seconds
    }

    fun isActive(session: UserSession): Boolean =
        session.isActive && !isExpired(session)
}

/**
 * EIAM — DeviceEngine (FASE 8)
 * Gestiona dispositivos autorizados por usuario.
 */
object DeviceEngine {

    fun authorizeDevice(
        uid: String,
        deviceId: String,
        model: String,
        manufacturer: String,
        osVersion: String,
        appVersion: String,
        fcmToken: String,
        fingerprint: String,
        platform: String = "ANDROID"
    ): DeviceInfo = DeviceInfo(
        deviceId = deviceId,
        uid = uid,
        model = model,
        manufacturer = manufacturer,
        platform = platform,
        osVersion = osVersion,
        appVersion = appVersion,
        fcmToken = fcmToken,
        fingerprint = fingerprint,
        status = DeviceStatus.AUTHORIZED,
        authorizedAt = Timestamp.now(),
        lastSeenAt = Timestamp.now()
    )

    fun revokeDevice(device: DeviceInfo): DeviceInfo =
        device.copy(
            status = DeviceStatus.REVOKED,
            revokedAt = Timestamp.now()
        )

    fun markSuspicious(device: DeviceInfo): DeviceInfo =
        device.copy(status = DeviceStatus.SUSPICIOUS)

    fun updateLastSeen(device: DeviceInfo): DeviceInfo =
        device.copy(lastSeenAt = Timestamp.now())

    fun isAuthorized(device: DeviceInfo): Boolean =
        device.status == DeviceStatus.AUTHORIZED
}
