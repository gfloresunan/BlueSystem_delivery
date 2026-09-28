package com.example.domain.model.identity.offline.shadow

import androidx.annotation.Keep
import java.util.concurrent.ConcurrentHashMap

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OFFLINE PARTITIONING (FASE 2C.10)
 * Repositorio Shadow de Particionado Multi-Tenant (In-Memory Isolation).
 */
@Keep
class ShadowTenantPartitionRepository {

    // Particionado aislado en memoria por tenantId
    private val ordersPartition = ConcurrentHashMap<String, MutableMap<String, OfflineOrderTenantAwareShadow>>()
    private val pendingActionsPartition = ConcurrentHashMap<String, MutableMap<String, TenantAwarePendingActionShadow>>()

    /**
     * Guarda una orden validando que coincida con el contexto de Tenant activo.
     */
    fun saveOrder(context: OfflineTenantContext, order: OfflineOrderTenantAwareShadow): Result<Unit> {
        if (order.tenantId != context.tenantId) {
            return Result.failure(
                SecurityException("Cross-Tenant Write Blocked: Order tenant '${order.tenantId}' no coincide con el contexto activo '${context.tenantId}'.")
            )
        }
        val tenantMap = ordersPartition.computeIfAbsent(context.tenantId) { ConcurrentHashMap() }
        tenantMap[order.orderId] = order
        return Result.success(Unit)
    }

    /**
     * Obtiene exclusivamente las órdenes correspondientes al Tenant activo.
     */
    fun getOrders(context: OfflineTenantContext): List<OfflineOrderTenantAwareShadow> {
        val tenantMap = ordersPartition[context.tenantId] ?: return emptyList()
        return tenantMap.values.toList()
    }

    /**
     * Obtiene una orden por ID con validación estricta de aislamiento de Tenant.
     */
    fun getOrderById(context: OfflineTenantContext, orderId: String): OfflineOrderTenantAwareShadow? {
        val tenantMap = ordersPartition[context.tenantId] ?: return null
        return tenantMap[orderId]
    }

    /**
     * Guarda una acción pendiente particionada por Tenant.
     */
    fun savePendingAction(context: OfflineTenantContext, action: TenantAwarePendingActionShadow): Result<Unit> {
        if (action.tenantId != context.tenantId) {
            return Result.failure(
                SecurityException("Cross-Tenant Pending Action Blocked: Action tenant '${action.tenantId}' no coincide con el contexto activo '${context.tenantId}'.")
            )
        }
        val actionsMap = pendingActionsPartition.computeIfAbsent(context.tenantId) { ConcurrentHashMap() }
        actionsMap[action.id] = action
        return Result.success(Unit)
    }

    /**
     * Obtiene las acciones pendientes del Tenant activo.
     */
    fun getPendingActions(context: OfflineTenantContext): List<TenantAwarePendingActionShadow> {
        val actionsMap = pendingActionsPartition[context.tenantId] ?: return emptyList()
        return actionsMap.values.toList()
    }

    /**
     * Limpia datos de sesión ante Logout sin destruir datos de otros Tenants.
     */
    fun clearTenantSession(tenantId: String) {
        ordersPartition.remove(tenantId)
        pendingActionsPartition.remove(tenantId)
    }

    /**
     * Conteo total de órdenes registradas en todas las particiones (para auditoría).
     */
    fun getTotalOrdersCountAcrossPartitions(): Int {
        return ordersPartition.values.sumOf { it.size }
    }
}
