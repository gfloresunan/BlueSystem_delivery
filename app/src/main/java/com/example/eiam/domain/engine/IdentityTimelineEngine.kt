package com.example.eiam.domain.engine

import com.example.eiam.domain.model.IdentityEvent
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — IdentityTimelineEngine (FASE 15)
 * Recupera el historial / línea de tiempo de eventos de identidad de un usuario o negocio.
 */
class IdentityTimelineEngine(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    suspend fun getUserTimeline(uid: String, limit: Long = 50): List<IdentityEvent> {
        return try {
            val snapshot = firestore.collection("audit_events")
                .whereEqualTo("uid", uid)
                .limit(limit)
                .get()
                .await()
            snapshot.toObjects(IdentityEvent::class.java)
                .sortedByDescending { it.occurredAt?.seconds ?: 0L }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getBusinessTimeline(businessId: String, limit: Long = 50): List<IdentityEvent> {
        return try {
            val snapshot = firestore.collection("audit_events")
                .whereEqualTo("businessId", businessId)
                .limit(limit)
                .get()
                .await()
            snapshot.toObjects(IdentityEvent::class.java)
                .sortedByDescending { it.occurredAt?.seconds ?: 0L }
        } catch (e: Exception) {
            emptyList()
        }
    }
}
