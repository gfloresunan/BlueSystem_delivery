package com.example.eiam.security.audit

import android.util.Log
import com.example.eiam.domain.model.IdentityEvent
import com.google.firebase.firestore.FirebaseFirestore

/**
 * EIAM — AuditLogger (FASE 15)
 * Logger centralizado de eventos de auditoría e identidad.
 */
object EiamAuditLogger {

    private const val TAG = "EIAM_AUDIT"
    private val firestore by lazy { FirebaseFirestore.getInstance() }

    fun logEvent(event: IdentityEvent) {
        Log.d(TAG, "[${event.eventType}] User: ${event.uid} | Action: ${event.eventType.name} | Business: ${event.businessId}")
        try {
            firestore.collection("audit_events")
                .document(event.eventId)
                .set(event)
        } catch (e: Exception) {
            Log.e(TAG, "Error persistiendo audit event: ${e.message}", e)
        }
    }
}
