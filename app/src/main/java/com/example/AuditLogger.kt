package com.example

import android.util.Log
import com.example.data.sync.SessionManager
import com.example.domain.model.AuditSeverity
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

/**
 * Registrador central de observabilidad, trazabilidad y auditoría de seguridad (Fase 12).
 */
object AuditLogger {
    private const val TAG = "AuditLogger"
    private val db: FirebaseFirestore
        get() = FirebaseFirestore.getInstance()

    /**
     * Genera un identificador único por transacción/operación (Request ID).
     */
    fun generateRequestId(): String = UUID.randomUUID().toString()

    /**
     * Registra un evento de auditoría inyectando automáticamente sessionId (Correlation ID) y severidad.
     */
    fun logEvent(
        event: String,
        details: Map<String, Any?> = emptyMap(),
        severity: AuditSeverity = AuditSeverity.INFO,
        requestId: String? = null
    ) {
        val timestamp = System.currentTimeMillis()
        val sessionId = SessionManager.currentSessionId

        val fullDetails = mutableMapOf<String, Any?>(
            "sessionId" to sessionId,
            "severity" to severity.name,
            "timestamp" to timestamp
        )
        if (requestId != null) {
            fullDetails["requestId"] = requestId
        }
        fullDetails.putAll(details)

        val formattedDetails = fullDetails.entries.joinToString(", ") { "${it.key}=${it.value}" }
        val logLine = "[SEVERITY: ${severity.name}] [EVENT: $event] SessionId: $sessionId | Details: {$formattedDetails}"

        try {
            when (severity) {
                AuditSeverity.INFO -> Log.i(TAG, logLine)
                AuditSeverity.WARNING -> Log.w(TAG, logLine)
                AuditSeverity.ERROR -> Log.e(TAG, logLine)
                AuditSeverity.SECURITY -> Log.w("SECURITY_AUDIT", logLine)
                AuditSeverity.CRITICAL -> Log.e("CRITICAL_AUDIT", logLine)
            }
        } catch (e: Throwable) {
            // Fallback para ejecución en entorno de Pruebas Unitarias JVM donde android.util.Log no está mockeado
            println(logLine)
        }

        // Almacenar prioritariamente en Firestore eventos de seguridad o críticos
        if (severity == AuditSeverity.SECURITY || severity == AuditSeverity.CRITICAL) {
            persistAuditLogAsync(event, fullDetails)
        }
    }

    private fun persistAuditLogAsync(event: String, payload: Map<String, Any?>) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val record = mapOf(
                    "action" to event,
                    "adminEmail" to (payload["uid"] ?: "system"),
                    "targetUid" to (payload["uid"] ?: "N/A"),
                    "details" to payload,
                    "timestamp" to com.google.firebase.Timestamp.now(),
                    "sessionId" to (payload["sessionId"] ?: ""),
                    "severity" to (payload["severity"] ?: "INFO")
                )
                db.collection("audit_logs").add(record).await()
                db.collection("audit_log").add(record).await()
            } catch (e: Exception) {
                Log.e(TAG, "Fallo al almacenar audit log prioritario en Firestore", e)
            }
        }
    }

    suspend fun logRollback(uid: String, email: String, reason: String) {
        val timestamp = System.currentTimeMillis()
        val logData = mapOf(
            "action" to "REGISTER_ROLLBACK",
            "adminEmail" to email,
            "targetUid" to uid,
            "reason" to reason,
            "timestamp" to com.google.firebase.Timestamp.now(),
            "details" to mapOf("uid" to uid, "reason" to reason, "timestamp" to timestamp)
        )
        try {
            db.collection("audit_logs").add(logData).await()
            db.collection("audit_log").add(logData).await()
            logEvent(
                event = "AUTH_REGISTER_ROLLBACK_STORED",
                details = mapOf("uid" to uid, "reason" to reason),
                severity = AuditSeverity.CRITICAL
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error writing rollback log to Firestore", e)
        }
    }
}
