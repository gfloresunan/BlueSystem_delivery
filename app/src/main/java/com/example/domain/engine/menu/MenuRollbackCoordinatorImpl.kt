package com.example.domain.engine.menu

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.model.menu.MenuAuditEvent
import com.example.domain.model.menu.MenuAuditEventType
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.repository.menu.IMenuAuditRepository
import com.example.domain.repository.menu.IMenuSnapshotRepository

class MenuRollbackCoordinatorImpl(
    private val snapshotRepository: IMenuSnapshotRepository,
    private val auditRepository: IMenuAuditRepository
) : IMenuRollbackCoordinator {

    override suspend fun executeRollback(
        restaurantId: String,
        targetSnapshot: MenuSnapshot,
        userId: String,
        reason: String
    ): RollbackResult {
        // 1. Validar integridad de Checksum si la firma está presente
        if (targetSnapshot.sha256Checksum.isNotBlank()) {
            val recalculatedChecksum = CanonicalJsonChecksumHelper.computeMenuChecksum(
                categories = targetSnapshot.categories,
                products = targetSnapshot.products,
                optionGroups = targetSnapshot.options
            )
            if (targetSnapshot.sha256Checksum != recalculatedChecksum) {
                return RollbackResult(
                    isSuccess = false,
                    restoredVersion = targetSnapshot.semanticVersion,
                    checksumVerified = false,
                    message = "Fallo de integridad: El checksum del snapshot no coincide."
                )
            }
        }

        // 2. Registrar evento de auditoría de Rollback
        val auditEvent = MenuAuditEvent(
            id = "audit_${System.currentTimeMillis()}",
            restaurantId = restaurantId,
            eventType = MenuAuditEventType.ROLLBACK_EXECUTED,
            semanticVersion = targetSnapshot.semanticVersion,
            userId = userId,
            changeReason = reason,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf(
                "snapshotId" to targetSnapshot.id,
                "sha256Checksum" to targetSnapshot.sha256Checksum
            )
        )
        auditRepository.recordEvent(auditEvent)

        return RollbackResult(
            isSuccess = true,
            restoredVersion = targetSnapshot.semanticVersion,
            checksumVerified = true,
            message = "Rollback a la versión ${targetSnapshot.semanticVersion} completado exitosamente."
        )
    }
}
