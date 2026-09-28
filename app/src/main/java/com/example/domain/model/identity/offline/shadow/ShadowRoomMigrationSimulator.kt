package com.example.domain.model.identity.offline.shadow

import androidx.annotation.Keep
import com.example.data.local.entity.OfflineOrderEntity

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OFFLINE PARTITIONING (FASE 2C.10)
 * Simulador de Migración Shadow de Entidades Room (Read-Only / Zero Destructive Writes).
 */
@Keep
class ShadowRoomMigrationSimulator {

    data class MigrationResult(
        val success: Boolean,
        val migratedOrders: List<OfflineOrderTenantAwareShadow>,
        val unmappedOrders: List<OfflineOrderEntity>,
        val errors: List<String>
    )

    /**
     * Simula la migración de entidades legacy asignando tenantId derivable.
     */
    fun simulateMigration(
        legacyOrders: List<OfflineOrderEntity>,
        businessToTenantMap: Map<String, String>,
        forceFail: Boolean = false
    ): MigrationResult {
        if (forceFail) {
            return MigrationResult(
                success = false,
                migratedOrders = emptyList(),
                unmappedOrders = legacyOrders,
                errors = listOf("Rollback Triggered: Fallo simulado durante la migración de schema.")
            )
        }

        val migrated = mutableListOf<OfflineOrderTenantAwareShadow>()
        val unmapped = mutableListOf<OfflineOrderEntity>()
        val errors = mutableListOf<String>()

        for (legacy in legacyOrders) {
            val tenantId = businessToTenantMap[legacy.businessId]
            if (tenantId.isNullOrBlank() || tenantId.contains("tenant_bluesystem_default")) {
                unmapped.add(legacy)
                errors.add("MIGRATION_PENDING: Orden '${legacy.orderId}' de negocio '${legacy.businessId}' no tiene Tenant resoluble.")
            } else {
                migrated.add(
                    OfflineOrderTenantAwareShadow(
                        orderId = legacy.orderId,
                        tenantId = tenantId,
                        businessId = legacy.businessId,
                        businessName = legacy.businessName,
                        customerId = legacy.customerId,
                        customerName = legacy.customerName,
                        customerPhone = legacy.customerPhone,
                        customerAddress = legacy.customerAddress,
                        latitude = legacy.latitude,
                        longitude = legacy.longitude,
                        total = legacy.total,
                        deliveryFee = legacy.deliveryFee,
                        status = legacy.status,
                        courierPhase = legacy.courierPhase,
                        assignedCourierId = legacy.assignedCourierId,
                        itemsJson = legacy.itemsJson,
                        paymentMethod = legacy.paymentMethod,
                        amountPaid = legacy.amountPaid,
                        receiptUrl = legacy.receiptUrl,
                        createdAt = legacy.createdAt,
                        updatedAt = legacy.updatedAt,
                        isSynced = legacy.isSynced
                    )
                )
            }
        }

        return MigrationResult(
            success = unmapped.isEmpty(),
            migratedOrders = migrated,
            unmappedOrders = unmapped,
            errors = errors
        )
    }
}
