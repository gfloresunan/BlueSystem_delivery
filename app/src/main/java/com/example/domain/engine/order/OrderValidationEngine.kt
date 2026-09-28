package com.example.domain.engine.order

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.order.Order

data class OrderValidationResult(
    val isValid: Boolean,
    val errors: List<String> = emptyList()
)

/**
 * Servidor de Dominio: OrderValidationEngine (Hito 14)
 * Valida la integridad del pedido consumiendo los motores inmutables de la Serie 13B.
 * Reutiliza: Snapshots, Checksum, Disponibilidad, Opciones y Reglas del Menú.
 */
class OrderValidationEngine {

    fun validateOrderAgainstSnapshot(
        order: Order,
        snapshot: MenuSnapshot
    ): OrderValidationResult {
        val errors = mutableListOf<String>()

        if (order.items.isEmpty()) {
            errors.add("El pedido no contiene ningún producto/item.")
        }

        if (snapshot.restaurantId != order.restaurantId) {
            errors.add("El snapshot no pertenece al restaurante del pedido.")
        }

        // 1. Verificación de Checksum de Integridad del Snapshot (Serie 13B)
        val computedChecksum = CanonicalJsonChecksumHelper.computeMenuChecksum(
            categories = snapshot.categories,
            products = snapshot.products,
            optionGroups = snapshot.options
        )

        if (snapshot.sha256Checksum.isNotBlank() && snapshot.sha256Checksum != computedChecksum) {
            errors.add("El checksum SHA-256 del snapshot no coincide (Documento corrupto o adulterado).")
        }

        // 2. Verificación de Productos Existentes en el Snapshot
        val validProductIds = snapshot.products.map { it.id }.toSet()
        order.items.forEach { item ->
            if (!validProductIds.contains(item.productId)) {
                errors.add("El producto '${item.productName}' (${item.productId}) no existe en el snapshot publicado del menú.")
            }
        }

        return OrderValidationResult(
            isValid = errors.isEmpty(),
            errors = errors
        )
    }
}
