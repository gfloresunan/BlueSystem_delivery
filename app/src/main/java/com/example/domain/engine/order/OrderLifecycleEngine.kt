package com.example.domain.engine.order

import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order

enum class UserRole {
    CLIENT,
    COOK,
    CASHIER,
    SUPERVISOR,
    OWNER,
    ADMIN
}

sealed class LifecycleTransitionResult {
    data class Success(val updatedOrder: Order) : LifecycleTransitionResult()
    data class Error(val message: String) : LifecycleTransitionResult()
}

/**
 * Servidor de Dominio: OrderLifecycleEngine (Hito 14)
 * Administrador de transiciones de estados financieros (CommercialStatus)
 * y operativos (OperationalStatus) validando permisos estrictos por rol.
 */
class OrderLifecycleEngine {

    fun updateCommercialStatus(
        order: Order,
        newStatus: CommercialStatus,
        userRole: UserRole
    ): LifecycleTransitionResult {
        val current = order.commercialStatus

        if (current == newStatus) {
            return LifecycleTransitionResult.Success(order)
        }

        // Permisos por rol para cambios de estado comercial
        val isAllowed = when (newStatus) {
            CommercialStatus.PENDING_PAYMENT -> userRole in setOf(UserRole.CLIENT, UserRole.CASHIER, UserRole.ADMIN)
            CommercialStatus.CONFIRMED -> userRole in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.OWNER, UserRole.ADMIN)
            CommercialStatus.CANCELLED -> userRole in setOf(UserRole.CLIENT, UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.OWNER, UserRole.ADMIN)
            CommercialStatus.REFUNDED -> userRole in setOf(UserRole.SUPERVISOR, UserRole.OWNER, UserRole.ADMIN)
            else -> false
        }

        if (!isAllowed) {
            return LifecycleTransitionResult.Error("El rol '$userRole' no tiene permisos para cambiar estado comercial a '$newStatus'")
        }

        val updated = order.copy(
            commercialStatus = newStatus,
            version = order.version + 1,
            updatedAt = System.currentTimeMillis()
        )
        return LifecycleTransitionResult.Success(updated)
    }

    fun updateOperationalStatus(
        order: Order,
        newStatus: OperationalStatus,
        userRole: UserRole
    ): LifecycleTransitionResult {
        val current = order.operationalStatus

        if (current == newStatus) {
            return LifecycleTransitionResult.Success(order)
        }

        // El pedido debe estar CONFIRMED comercialmente para avanzar en cocina (salvo cancelado)
        if (order.commercialStatus != CommercialStatus.CONFIRMED && newStatus != OperationalStatus.QUEUED) {
            return LifecycleTransitionResult.Error("No se puede avanzar en cocina un pedido que no está CONFIRMED comercialmente.")
        }

        // Permisos por rol para cambios operacionales
        val isAllowed = when (newStatus) {
            OperationalStatus.QUEUED -> true
            OperationalStatus.PREPARING -> userRole in setOf(UserRole.COOK, UserRole.SUPERVISOR, UserRole.ADMIN)
            OperationalStatus.ASSEMBLING -> userRole in setOf(UserRole.COOK, UserRole.SUPERVISOR, UserRole.ADMIN)
            OperationalStatus.READY -> userRole in setOf(UserRole.COOK, UserRole.SUPERVISOR, UserRole.ADMIN)
            OperationalStatus.PACKED -> userRole in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
            OperationalStatus.OUT_FOR_DELIVERY -> userRole in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
            OperationalStatus.DELIVERED -> userRole in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
        }

        if (!isAllowed) {
            return LifecycleTransitionResult.Error("El rol '$userRole' no tiene permisos para cambiar estado operativo a '$newStatus'")
        }

        val actualReady = if (newStatus == OperationalStatus.READY) System.currentTimeMillis() else order.actualReadyTime

        val updated = order.copy(
            operationalStatus = newStatus,
            actualReadyTime = actualReady,
            version = order.version + 1,
            updatedAt = System.currentTimeMillis()
        )
        return LifecycleTransitionResult.Success(updated)
    }
}
