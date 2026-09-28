package com.example.presentation.customer.profile

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.example.Pedido

/**
 * Representación visual y semántica unificada del estado del pedido para el cliente.
 */
data class OrderPresentationInfo(
    val title: String,
    val shortLabel: String,
    val formattedOrderId: String,
    val icon: ImageVector,
    val isRestaurant: Boolean
)

data class OrderTimelineDisplayStep(
    val title: String,
    val icon: ImageVector,
    val isCompleted: Boolean,
    val isCurrent: Boolean
)

object OrderPresentationResolver {

    private val GASTRO_KEYWORDS = listOf(
        "restaurante", "restaurant", "comida rapida", "fast food", "fast_food",
        "cafeteria", "panaderia", "bakery", "cafe", "gastronomia", "reposteria", "pizzeria",
        "heladeria", "hamburguesas", "tacos", "antojitos", "pupuseria", "asados", "mariscos",
        "comida", "food", "beverage"
    )

    private val NON_GASTRO_KEYWORDS = listOf(
        "tecnologia", "technology", "gadgets", "supermercado", "supermarket", "abarrotes",
        "farmacia", "pharmacy", "salud", "ropa", "clothing", "calzado", "tienda", "retail",
        "electronics", "hardware", "ferreteria", "zapateria", "belleza", "cosmeticos"
    )

    fun isGastronomyCategory(category: String?, businessType: String? = null): Boolean {
        val candidates = listOfNotNull(businessType, category)
        for (raw in candidates) {
            val norm = raw.lowercase()
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .trim()
            if (norm.isBlank()) continue
            if (NON_GASTRO_KEYWORDS.any { norm.contains(it) }) return false
            if (GASTRO_KEYWORDS.any { norm.contains(it) }) return true
        }
        return false // Fallback de seguridad incondicional: no asumir restaurante
    }

    fun resolve(
        order: Pedido,
        isRestaurant: Boolean = false
    ): OrderPresentationInfo {
        val rawStatus = order.status.ifBlank { order.estado }.lowercase().trim()
        val formattedId = if (order.displayOrderCode.isNotBlank()) "ID del pedido: #${order.displayOrderCode.removePrefix("#")}" else if (order.pedidoId.isNotBlank()) "ID del pedido: #${order.pedidoId.takeLast(6).uppercase()}" else ""

        val (title, shortLabel, icon) = when (rawStatus) {
            "pending", "pendiente" -> Triple(
                "Pedido recibido",
                "Pedido recibido",
                Icons.Default.AccessTime
            )
            "preparing", "preparando", "en_cocina" -> {
                if (isRestaurant) {
                    Triple("🍳 Pedido en Cocina", "En cocina", Icons.Default.Restaurant)
                } else {
                    Triple("📦 Tu pedido en Preparación", "En preparación", Icons.Default.Inventory2)
                }
            }
            "ready", "listo" -> Triple(
                "📦 Tu pedido está listo",
                "Pedido listo",
                Icons.Default.Inventory2
            )
            "assigned", "asignado" -> Triple(
                "🛵 Repartidor asignado",
                "Repartidor asignado",
                Icons.AutoMirrored.Filled.DirectionsBike
            )
            "courier_accepted", "aceptado_por_motorizado" -> Triple(
                "🛵 Repartidor confirmado",
                "Repartidor confirmado",
                Icons.AutoMirrored.Filled.DirectionsBike
            )
            "picked_up", "recogido" -> Triple(
                "📦 Pedido recogido",
                "Pedido recogido",
                Icons.Default.Inventory2
            )
            "in_transit", "en_camino", "en_ruta" -> Triple(
                "🛵 Tu pedido está en camino",
                "En camino",
                Icons.AutoMirrored.Filled.DirectionsBike
            )
            "delivered", "entregado", "completed", "completado" -> Triple(
                "🎉 ¡Pedido entregado!",
                "Entregado",
                Icons.Default.CheckCircle
            )
            "cancelled", "cancelado" -> Triple(
                "Pedido cancelado",
                "Cancelado",
                Icons.Default.Cancel
            )
            else -> Triple(
                "Pedido recibido",
                "Pedido recibido",
                Icons.Default.AccessTime
            )
        }

        return OrderPresentationInfo(
            title = title,
            shortLabel = shortLabel,
            formattedOrderId = formattedId,
            icon = icon,
            isRestaurant = isRestaurant
        )
    }

    /**
     * Construye los 5 hitos canónicos del Timeline para el cliente:
     * 1. Pedido recibido
     * 2. En preparación / En cocina
     * 3. Pedido listo
     * 4. En camino
     * 5. Entregado
     */
    fun buildTimelineSteps(
        order: Pedido,
        isRestaurant: Boolean = false
    ): List<OrderTimelineDisplayStep> {
        val rawStatus = order.status.ifBlank { order.estado }.lowercase().trim()
        val isCancelled = rawStatus in listOf("cancelled", "cancelado")

        // Nivel de progreso de 1 a 5
        val progressLevel = when (rawStatus) {
            "pending", "pendiente" -> 1
            "preparing", "preparando", "en_cocina" -> 2
            "ready", "listo", "assigned", "asignado", "courier_accepted", "aceptado_por_motorizado" -> 3
            "picked_up", "recogido", "in_transit", "en_camino", "en_ruta" -> 4
            "delivered", "entregado", "completed", "completado" -> 5
            else -> 1
        }

        val step2Title = if (isRestaurant) "🍳 En cocina" else "📦 En preparación"
        val step2Icon = if (isRestaurant) Icons.Default.Restaurant else Icons.Default.Inventory2

        return listOf(
            OrderTimelineDisplayStep(
                title = "✓ Pedido recibido",
                icon = Icons.Default.Receipt,
                isCompleted = progressLevel >= 1 && !isCancelled,
                isCurrent = progressLevel == 1 && !isCancelled
            ),
            OrderTimelineDisplayStep(
                title = step2Title,
                icon = step2Icon,
                isCompleted = progressLevel >= 2 && !isCancelled,
                isCurrent = progressLevel == 2 && !isCancelled
            ),
            OrderTimelineDisplayStep(
                title = "📦 Pedido listo",
                icon = Icons.Default.Inventory2,
                isCompleted = progressLevel >= 3 && !isCancelled,
                isCurrent = progressLevel == 3 && !isCancelled
            ),
            OrderTimelineDisplayStep(
                title = "🛵 En camino",
                icon = Icons.AutoMirrored.Filled.DirectionsBike,
                isCompleted = progressLevel >= 4 && !isCancelled,
                isCurrent = progressLevel == 4 && !isCancelled
            ),
            OrderTimelineDisplayStep(
                title = "🎉 Entregado",
                icon = Icons.Default.CheckCircle,
                isCompleted = progressLevel >= 5 && !isCancelled,
                isCurrent = progressLevel == 5 && !isCancelled
            )
        )
    }

    /**
     * Determina de forma centralizada si un pedido ha sido físicamente entregado.
     * Regla de Integridad de Cierre:
     * - "delivered" / "entregado" -> Entrega física confirmada.
     * - "completed" / "completado" -> Requiere deliveredAt != null para confirmar entrega física
     *   (evita que un cierre puramente administrativo/financiero autorice rating indebido).
     * - Otros estados ("pending", "preparing", "cancelled", etc.) -> No entregados físicamente.
     */
    fun isOrderPhysicallyDelivered(order: Pedido): Boolean {
        val rawStatus = order.status.ifBlank { order.estado }.lowercase().trim()
        return when (rawStatus) {
            "delivered", "entregado" -> true
            "completed", "completado" -> order.deliveredAt != null
            else -> false
        }
    }

    /**
     * Valida la elegibilidad estricta para que un cliente pueda calificar un pedido:
     * 1. Entrega física confirmada.
     * 2. Pertenencia legítima al cliente (si currentAuthUid se provee).
     * 3. No haber sido calificado previamente (!hasBeenRated).
     * 4. Identificadores canónicos válidos (pedidoId y businessId no vacíos).
     */
    fun isOrderRatingEligible(order: Pedido, currentAuthUid: String? = null): Boolean {
        if (!isOrderPhysicallyDelivered(order)) return false
        if (!currentAuthUid.isNullOrBlank()) {
            val client = order.clienteId.ifBlank { order.customerId }.trim()
            if (client.isNotEmpty() && client != currentAuthUid.trim()) {
                return false
            }
        }
        if (order.hasBeenRated) return false
        if (order.pedidoId.isBlank() || order.businessId.isBlank()) return false
        return true
    }

    /**
     * Resuelve la identidad canónica del motorizado asignado (ADR-013 / ADR-016).
     * Prioridad canónica: assignedCourierId > motorizadoId.
     * Previene fallas con cadenas vacías "" evitando el fallo del operador Elvis clásico.
     */
    fun resolveCanonicalCourierId(order: Pedido): String {
        val assigned = order.assignedCourierId.trim()
        val motorizado = order.motorizadoId.trim()
        return when {
            assigned.isNotEmpty() -> assigned
            motorizado.isNotEmpty() -> motorizado
            else -> ""
        }
    }
}

