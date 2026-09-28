package com.example.eiam.domain.repository

import com.example.eiam.domain.model.Invitation

/**
 * EIAM — Interface IInvitationRepository (FASE 5)
 */
interface IInvitationRepository {
    suspend fun getInvitationByToken(token: String): Invitation?
    suspend fun getInvitationsByBusinessId(businessId: String): List<Invitation>
    suspend fun saveInvitation(invitation: Invitation): Boolean
    suspend fun updateInvitationStatus(token: String, status: String, acceptedByUid: String? = null): Boolean
    suspend fun revokeInvitation(token: String): Boolean
}
