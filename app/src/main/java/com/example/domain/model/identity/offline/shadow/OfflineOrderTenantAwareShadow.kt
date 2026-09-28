package com.example.domain.model.identity.offline.shadow

import androidx.annotation.Keep
import com.example.domain.model.identity.TenantScopedRecord

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OFFLINE PARTITIONING (FASE 2C.10)
 * Shadow Tenant-Aware Offline Order Model (Zero Mutation to Legacy OfflineOrderEntity).
 */
@Keep
data class OfflineOrderTenantAwareShadow(
    val orderId: String,
    override val tenantId: String,
    val brandId: String? = null,
    val businessId: String,
    val branchId: String? = null,
    val businessName: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val customerPhone: String = "",
    val customerAddress: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val total: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val status: String = "",
    val courierPhase: Int? = null,
    val assignedCourierId: String = "",
    val itemsJson: String = "",
    val paymentMethod: String = "",
    val amountPaid: Double? = null,
    val receiptUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
) : TenantScopedRecord {

    init {
        require(orderId.isNotBlank()) { "orderId no puede estar vacío." }
        require(tenantId.isNotBlank()) { "tenantId no puede estar vacío en almacenamiento particionado." }
        require(!tenantId.contains("tenant_bluesystem_default")) { "Prohibida la asignación de tenant default ficticio." }
    }
}
