package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuSnapshot

data class RollbackResult(
    val isSuccess: Boolean,
    val restoredVersion: String,
    val checksumVerified: Boolean,
    val message: String
)

interface IMenuRollbackCoordinator {
    suspend fun executeRollback(
        restaurantId: String,
        targetSnapshot: MenuSnapshot,
        userId: String,
        reason: String
    ): RollbackResult
}
