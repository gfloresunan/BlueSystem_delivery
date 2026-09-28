package com.example.eiam.domain.usecase

import com.example.eiam.domain.engine.InvitationEngine
import com.example.eiam.domain.engine.InvitationValidationResult
import com.example.eiam.domain.model.Invitation
import com.example.eiam.domain.model.InvitationStatus
import com.example.eiam.domain.repository.IInvitationRepository

/**
 * EIAM — AcceptInvitationUseCase (FASE 5)
 */
class AcceptInvitationUseCase(
    private val repository: IInvitationRepository
) {
    suspend operator fun invoke(
        token: String,
        acceptingUid: String,
        acceptingEmail: String
    ): Result<Invitation> {
        val invitation = repository.getInvitationByToken(token)
            ?: return Result.failure(IllegalArgumentException("Invitación no encontrada."))

        val validation = InvitationEngine.validateForAcceptance(invitation)
        if (validation != InvitationValidationResult.VALID) {
            return Result.failure(IllegalStateException("Invitación inválida o expirada: $validation"))
        }

        val updated = InvitationEngine.accept(invitation, acceptingUid)
        val success = repository.updateInvitationStatus(token, InvitationStatus.ACCEPTED.name, acceptingUid)
        return if (success) {
            Result.success(updated)
        } else {
            Result.failure(RuntimeException("Error al actualizar el estado de la invitación."))
        }
    }
}
