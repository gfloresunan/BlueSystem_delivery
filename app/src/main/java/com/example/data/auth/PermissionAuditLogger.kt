package com.example.data.auth

import android.util.Log
import com.example.AuditLogger
import com.example.data.sync.SessionManager
import com.google.firebase.auth.FirebaseAuth

/**
 * Registrador especializado de auditoría para eventos de autorización y permisos (Fase 10).
 */
object PermissionAuditLogger {

    private const val TAG = "PERMISSION_AUDIT"

    /**
     * Registra un evento de acceso denegado (PERMISSION_DENIED).
     */
    fun logPermissionDenied(permissionName: String, screen: String = "UnknownScreen") {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: "GUEST"
        val sessionMode = SessionManager.currentMode.name
        val timestamp = System.currentTimeMillis()

        val details = mapOf(
            "uid" to uid,
            "permission" to permissionName,
            "screen" to screen,
            "timestamp" to timestamp,
            "session" to sessionMode
        )

        Log.w(
            TAG,
            "PERMISSION_DENIED | UID: $uid | Permission: $permissionName | Screen: $screen | Session: $sessionMode | Time: $timestamp"
        )

        // Registrar evento en AuditLogger con severidad SECURITY para almacenamiento y trazabilidad
        AuditLogger.logEvent(
            event = "PERMISSION_DENIED",
            details = details,
            severity = com.example.domain.model.AuditSeverity.SECURITY
        )
    }
}
