package com.example.domain.model.identity.offline.shadow

import androidx.annotation.Keep
import com.example.domain.model.identity.ActiveTenantContext

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OFFLINE PARTITIONING (FASE 2C.10)
 * Contexto de Tenant Offline Derivado de ActiveTenantContext.
 */
@Keep
data class OfflineTenantContext(
    val tenantId: String,
    val brandId: String? = null,
    val businessId: String? = null,
    val branchId: String? = null,
    val role: String,
    val isPartitioningActive: Boolean = true
) {
    init {
        require(tenantId.isNotBlank()) { "tenantId no puede estar vacío." }
        require(!tenantId.contains("tenant_bluesystem_default")) { "Prohibido tenant default ficticio." }
    }

    companion object {
        fun fromActiveContext(activeContext: ActiveTenantContext): OfflineTenantContext {
            return OfflineTenantContext(
                tenantId = activeContext.tenantId,
                brandId = activeContext.brandId,
                businessId = activeContext.businessId,
                branchId = activeContext.branchId,
                role = activeContext.role.name,
                isPartitioningActive = true
            )
        }
    }
}
