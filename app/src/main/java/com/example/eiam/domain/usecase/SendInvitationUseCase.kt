package com.example.eiam.domain.usecase

import com.example.eiam.domain.engine.InvitationEngine
import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.Invitation
import com.example.eiam.domain.repository.IInvitationRepository

/**
 * EIAM — SendInvitationUseCase (FASE 5)
 */
class SendInvitationUseCase(
    private val repository: IInvitationRepository
) {
    suspend operator fun invoke(
        email: String,
        businessId: String,
        role: EiamRole,
        createdByUid: String,
        branchId: String? = null
    ): Result<Invitation> {
        val invitation = InvitationEngine.createInvitation(
            businessId = businessId,
            branchId = branchId,
            role = role,
            invitedEmail = email,
            invitedBy = createdByUid
        )
        val success = repository.saveInvitation(invitation)
        return if (success) {
            Result.success(invitation)
        } else {
            Result.failure(RuntimeException("Error guardando la invitación."))
        }
    }
}
