package com.example.eiam.data.repository

import com.example.eiam.domain.model.Invitation
import com.example.eiam.domain.repository.IInvitationRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — InvitationRepository (FASE 5)
 * Implementación de Firestore para invitaciones.
 */
class InvitationRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IInvitationRepository {

    private val collection = firestore.collection("invitations")

    override suspend fun getInvitationByToken(token: String): Invitation? {
        return try {
            val snapshot = collection.document(token).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(Invitation::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getInvitationsByBusinessId(businessId: String): List<Invitation> {
        return try {
            val snapshot = collection.whereEqualTo("businessId", businessId).get().await()
            snapshot.toObjects(Invitation::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun saveInvitation(invitation: Invitation): Boolean {
        return try {
            collection.document(invitation.token).set(invitation).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateInvitationStatus(token: String, status: String, acceptedByUid: String?): Boolean {
        return try {
            val updates = mutableMapOf<String, Any>(
                "status" to status
            )
            if (acceptedByUid != null) {
                updates["acceptedByUid"] = acceptedByUid
                updates["acceptedAt"] = System.currentTimeMillis()
            }
            collection.document(token).update(updates).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun revokeInvitation(token: String): Boolean {
        return try {
            collection.document(token).update("status", "REVOKED").await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
