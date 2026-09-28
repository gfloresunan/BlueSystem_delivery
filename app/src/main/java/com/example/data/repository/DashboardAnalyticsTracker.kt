package com.example.data.repository

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import java.util.UUID

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D DASHBOARD ANALYTICS TRACKER
 * Protocolo: BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001 (Addendum P0-01 & S-01)
 *
 * Registra exclusivamente eventos de telemetría de interacción directa (view, click).
 * Escritura estrictamente atómica, inmutable y append-only en /dashboard_events/{eventId}.
 * PROHIBIDO: mutar contadores de revenue u orders desde el cliente móvil.
 */
object DashboardAnalyticsTracker {

    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    /**
     * Registra un evento atómico de interacción directa en el Customer Dashboard.
     */
    fun logEvent(
        eventType: String, // "view", "click"
        itemType: String,  // "banner", "product", "category", "business", "deal", "branch", "express_delivery", "quick_reorder"
        itemId: String,
        itemName: String = "",
        metadata: Map<String, Any> = emptyMap()
    ) {
        val user = auth.currentUser ?: return // Fail-closed: Requiere autenticación
        val customerId = user.uid

        // Resuelve tenantId desde los claims del token JWT para asegurar no-spoofing
        user.getIdToken(false).addOnSuccessListener { tokenResult ->
            val tenantClaim = tokenResult.claims["tenantId"] as? String
            val effectiveTenantId = tenantClaim?.takeIf { it.isNotBlank() } ?: "GLOBAL"

            val eventId = UUID.randomUUID().toString()
            val docRef = db.collection("dashboard_events").document(eventId)

            val eventData = hashMapOf<String, Any>(
                "eventId" to eventId,
                "eventType" to eventType.trim().lowercase(),
                "itemType" to itemType.trim().lowercase(),
                "itemId" to itemId.ifBlank { "general" },
                "itemName" to itemName,
                "customerId" to customerId,
                "tenantId" to effectiveTenantId,
                "timestamp" to FieldValue.serverTimestamp(),
                "metadata" to metadata
            )

            docRef.set(eventData)
                .addOnFailureListener { e ->
                    Log.w("AnalyticsTracker", "Error persisting dashboard event $eventId: ${e.message}")
                }
        }.addOnFailureListener { e ->
            Log.w("AnalyticsTracker", "Error obtaining token claims for analytics: ${e.message}")
        }
    }

    /**
     * Sobrecarga de compatibilidad hacia atrás para llamadas legacy que pasaban revenueAmount.
     * Descarta silenciosamente el monto para proteger la integridad financiera del backend.
     */
    @Deprecated("Client-side revenue recording is prohibited by P0-01/S-01 architecture.", ReplaceWith("logEvent(eventType, itemType, itemId, itemName)"))
    fun logEvent(
        eventType: String,
        itemType: String,
        itemId: String,
        itemName: String,
        @Suppress("UNUSED_PARAMETER") revenueAmount: Double
    ) {
        logEvent(eventType, itemType, itemId, itemName, emptyMap())
    }
}
