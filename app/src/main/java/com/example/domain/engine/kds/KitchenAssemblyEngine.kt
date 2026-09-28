package com.example.domain.engine.kds

import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order

data class AssemblyStatus(
    val isComplete: Boolean,
    val pendingStations: List<KitchenStation>,
    val readyItemCount: Int,
    val totalItemCount: Int
)

/**
 * Servidor de Dominio: KitchenAssemblyEngine (Hito 14)
 * Controla el ensamblado de pedidos preparados en múltiples estaciones de cocina en paralelo.
 * Garantiza que NO se permita marcar un pedido como READY hasta que TODAS las estaciones hayan finalizado sus ítems.
 */
class KitchenAssemblyEngine {

    fun checkAssemblyCompleteness(order: Order): AssemblyStatus {
        val total = order.items.size
        val readyItems = order.items.filter { it.isItemReady }

        val pendingStations = order.items
            .filter { !it.isItemReady }
            .map { it.targetStation }
            .distinct()

        val isComplete = total > 0 && readyItems.size == total

        return AssemblyStatus(
            isComplete = isComplete,
            pendingStations = pendingStations,
            readyItemCount = readyItems.size,
            totalItemCount = total
        )
    }

    fun markItemAsReady(order: Order, itemId: String): Order {
        val updatedItems = order.items.map { item ->
            if (item.id == itemId) item.copy(isItemReady = true) else item
        }
        val assemblyStatus = checkAssemblyCompleteness(order.copy(items = updatedItems))
        val newOpStatus = if (assemblyStatus.isComplete) OperationalStatus.READY else OperationalStatus.ASSEMBLING

        return order.copy(
            items = updatedItems,
            operationalStatus = newOpStatus,
            updatedAt = System.currentTimeMillis()
        )
    }
}
