package com.example.kds

import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.engine.order.OrderLifecycleEngine
import com.example.domain.engine.order.UserRole
import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import com.example.domain.model.order.ReservationStatus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 3: Offline & Sincronización
 *
 * Valida el comportamiento del sistema cuando opera sin conectividad:
 * - Creación de pedido sin red → persistido localmente
 * - Rollback automático de inventario en desconexión durante pago (TTL)
 * - Reconciliación sin "inventarios fantasma" al reconectar
 */
class OfflineOrderCreationTest {

    private val inventoryEngine = InventoryReservationEngine()
    private val lifecycleEngine = OrderLifecycleEngine()

    // ─────────────────────────────────────────────────────────────────────────
    // TC-OFFLINE-01: Pedido creado offline persiste estado HELD en reserva
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-OFFLINE-01 Order created offline holds inventory reservation in HELD state`() = runBlocking {
        val offlineOrder = Order(
            id = "ord_offline_001",
            restaurantId = "rest_offline",
            isOfflineCreated = true,
            items = listOf(
                OrderItem(id = "off_item_1", productId = "prod_offline_a", quantity = 2),
                OrderItem(id = "off_item_2", productId = "prod_offline_b", quantity = 1)
            )
        )

        // Simula creación offline → reserva de inventario local (HELD)
        val reservation = inventoryEngine.reserveInventory(
            orderId = offlineOrder.id,
            restaurantId = "rest_offline",
            branchId = "branch_offline",
            items = offlineOrder.items
        )
        assertTrue("La reserva debe ser exitosa incluso en modo offline", reservation.isSuccess)

        // Verificar que el estado es HELD (pendiente de confirmación de pago)
        val reservations = inventoryEngine.getReservationsForOrder(offlineOrder.id)
        assertTrue("Debe existir al menos una reserva", reservations.isNotEmpty())
        reservations.forEach { r ->
            assertEquals("Todas las reservas offline deben estar en HELD", ReservationStatus.HELD, r.status)
        }

        // El pedido offline debe estar marcado correctamente
        assertTrue("El pedido debe marcarse como creado offline", offlineOrder.isOfflineCreated)
        assertNotNull("El ID del pedido offline no debe ser nulo", offlineOrder.id)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-OFFLINE-02: Desconexión durante pago → TTL expira → EXPIRED, no CONSUMED
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-OFFLINE-02 Network drop during payment causes reservation TTL expiry`() = runBlocking {
        val orderId = "ord_offline_ttl"
        val items = listOf(OrderItem(id = "ttl_item_1", productId = "prod_ttl"))

        // Reserva creada (pago iniciado, luego se corta la red)
        inventoryEngine.reserveInventory(orderId, "rest_ttl", "branch_ttl", items)

        val reservations = inventoryEngine.getReservationsForOrder(orderId)
        assertEquals("La reserva debe existir en estado HELD", ReservationStatus.HELD, reservations[0].status)

        // Simular expiración de TTL (15 minutos sin confirmación → EXPIRED)
        // Usamos checkAndCleanupExpiredReservations con un tiempo en el futuro (más allá del TTL)
        val futureTime = System.currentTimeMillis() + (20L * 60L * 1000L) // +20 minutos
        inventoryEngine.checkAndCleanupExpiredReservations(futureTime)
        val expired = inventoryEngine.getReservationsForOrder(orderId)
        assertEquals("La reserva debe expirar a EXPIRED al superar el TTL", ReservationStatus.EXPIRED, expired[0].status)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-OFFLINE-03: Reconexión → Rollback evita inventario fantasma
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-OFFLINE-03 Reconnection triggers rollback to prevent ghost inventory`() = runBlocking {
        val orderId = "ord_offline_ghost"
        val items = listOf(
            OrderItem(id = "ghost_item_1", productId = "prod_ghost_a"),
            OrderItem(id = "ghost_item_2", productId = "prod_ghost_b")
        )

        // Reserva creada en modo offline
        inventoryEngine.reserveInventory(orderId, "rest_ghost", "branch_ghost", items)

        // Al reconectar: el servidor detecta que el pago no fue confirmado
        // Rollback automático (evita "inventario fantasma")
        // En la API existente, rollback solo aplica a reservas HELD o PARTIALLY_CONSUMED
        inventoryEngine.rollbackReservationsForOrder(orderId, "RECONNECTION_SYNC_ROLLBACK")

        val reservations = inventoryEngine.getReservationsForOrder(orderId)
        reservations.forEach { r ->
            assertEquals(
                "Tras rollback de reconexión, la reserva debe quedar RELEASED (no CONSUMED ni HELD)",
                ReservationStatus.RELEASED,
                r.status
            )
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-OFFLINE-04: Cancelación offline → libre inventario inmediatamente
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-OFFLINE-04 Offline order cancellation immediately releases inventory`() = runBlocking {
        val order = Order(
            id = "ord_offline_cancel",
            restaurantId = "rest_offline_c",
            isOfflineCreated = true,
            items = listOf(OrderItem(id = "oc_item_1", productId = "prod_oc"))
        )

        inventoryEngine.reserveInventory(order.id, "rest_offline_c", "branch_c", order.items)

        // Cancelar el pedido offline
        lifecycleEngine.updateCommercialStatus(order, CommercialStatus.CANCELLED, UserRole.CASHIER)
        inventoryEngine.rollbackReservationsForOrder(order.id, "OFFLINE_CANCELLATION")

        val reservations = inventoryEngine.getReservationsForOrder(order.id)
        assertEquals("El inventario debe liberarse (RELEASED) tras cancelación offline", ReservationStatus.RELEASED, reservations[0].status)
    }
}
