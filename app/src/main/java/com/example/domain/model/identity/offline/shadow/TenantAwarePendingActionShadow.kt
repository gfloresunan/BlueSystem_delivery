package com.example.domain.model.identity.offline.shadow

import androidx.annotation.Keep
import com.example.domain.model.identity.TenantScopedRecord
import java.util.UUID

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OFFLINE PARTITIONING (FASE 2C.10)
 * Shadow Tenant-Aware Pending Action Model (Zero Mutation to Legacy PendingActionEntity).
 */
@Keep
data class TenantAwarePendingActionShadow(
    val id: String = UUID.randomUUID().toString(),
    override val tenantId: String,
    val businessId: String? = null,
    val branchId: String? = null,
    val orderId: String = "",
    val actionType: String,
    val payload: String = "{}",
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val status: String = "PENDING",
    val lastError: String? = null
) : TenantScopedRecord {

    init {
        require(id.isNotBlank()) { "id de acción no puede estar vacío." }
        require(tenantId.isNotBlank()) { "tenantId es obligatorio para acciones pendientes particionadas." }
        require(!tenantId.contains("tenant_bluesystem_default")) { "Prohibida la asignación de tenant default ficticio." }
    }
}
