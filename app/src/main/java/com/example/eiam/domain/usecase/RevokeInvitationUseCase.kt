package com.example.eiam.domain.usecase

import com.example.eiam.domain.repository.IInvitationRepository

/**
 * EIAM — RevokeInvitationUseCase (FASE 5)
 */
class RevokeInvitationUseCase(
    private val repository: IInvitationRepository
) {
    suspend operator fun invoke(token: String): Result<Boolean> {
        val success = repository.revokeInvitation(token)
        return if (success) {
            Result.success(true)
        } else {
            Result.failure(RuntimeException("Error al revocar la invitación."))
        }
    }
}
