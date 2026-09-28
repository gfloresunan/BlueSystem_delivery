package com.example.eiam.data.repository

import com.example.eiam.domain.model.UserSession
import com.example.eiam.domain.repository.ISessionRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — SessionRepository (FASE 8)
 * Implementación de Firestore para sesiones.
 */
class SessionRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : ISessionRepository {

    private val collection = firestore.collection("sessions")

    override suspend fun getSessionById(sessionId: String): UserSession? {
        return try {
            val snapshot = collection.document(sessionId).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(UserSession::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getActiveSessionsByUid(uid: String): List<UserSession> {
        return try {
            val snapshot = collection
                .whereEqualTo("uid", uid)
                .whereEqualTo("isActive", true)
                .get()
                .await()
            snapshot.toObjects(UserSession::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun saveSession(session: UserSession): Boolean {
        return try {
            collection.document(session.sessionId).set(session).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun revokeSession(sessionId: String): Boolean {
        return try {
            collection.document(sessionId).update("isActive", false).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun revokeAllSessions(uid: String): Boolean {
        return try {
            val activeSessions = getActiveSessionsByUid(uid)
            val batch = firestore.batch()
            activeSessions.forEach { session ->
                val ref = collection.document(session.sessionId)
                batch.update(ref, "isActive", false)
            }
            batch.commit().await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
