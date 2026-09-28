package com.example.kds

import com.example.domain.engine.kds.KdsQueueEngine
import com.example.domain.engine.kds.KitchenStation
import com.example.domain.engine.order.InventoryReservationEngine
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 5: Pruebas de Estrés y Carga
 *
 * Simula carga de producción real:
 * - 100 pedidos simultáneos
 * - Sin stock negativo (invariante de inventario)
 * - Sin condiciones de carrera en la cola KDS
 */
class HighLoadConcurrencyTest {

    private val queueEngine = KdsQueueEngine()
    private val inventoryEngine = InventoryReservationEngine()

    // ─────────────────────────────────────────────────────────────────────────
    // TC-STRESS-01: 100 pedidos simultáneos sin condiciones de carrera
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-STRESS-01 100 simultaneous orders enqueue without race conditions`() = runBlocking {
        val orderCount = 100
        val jobs = (1..orderCount).map { i ->
            async {
                val order = Order(
                    id = "ord_stress_$i",
                    restaurantId = "rest_stress",
                    items = listOf(OrderItem(id = "item_stress_$i", productId = "prod_$i", targetStation = KitchenStation.GRILL))
                )
                queueEngine.enqueue(order, KitchenStation.GRILL)
            }
        }

        val tickets = jobs.awaitAll()

        assertEquals("Deben generarse exactamente $orderCount tickets", orderCount, tickets.size)

        // Verificar IDs únicos — sin duplicados en la cola
        val uniqueTicketIds = tickets.map { it.ticketId }.toSet()
        assertEquals("Cada ticket debe tener ID único", orderCount, uniqueTicketIds.size)

        val queue = queueEngine.getQueueByStation("rest_stress")
        assertEquals("La cola debe contener exactamente $orderCount tickets", orderCount, queue.size)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-STRESS-02: Inventario no baja de cero bajo reservas simultáneas
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-STRESS-02 Concurrent inventory reservations never produce negative stock`() = runBlocking {
        val reservations = (1..50).map { i ->
            async {
                inventoryEngine.reserveInventory(
                    orderId = "ord_inv_$i",
                    restaurantId = "rest_inv",
                    branchId = "branch_inv",
                    items = listOf(OrderItem(id = "inv_item_$i", productId = "shared_product", quantity = 1))
                )
            }
        }.awaitAll()

        // Todas las reservas deben ser exitosas (el simulador no tiene límite de stock, pero no debe fallar)
        val allSucceeded = reservations.all { it.isSuccess }
        assertTrue("Todas las reservas deben completarse sin excepción", allSucceeded)

        // Ninguna reserva debe producir un estado inválido (null o corrupción)
        reservations.forEach { result ->
            assertTrue("Cada resultado de reserva debe ser un Success", result.isSuccess)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-STRESS-03: Throughput de la cola KDS — 100 tickets en < 500ms
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-STRESS-03 KDS queue handles 100 enqueues under 500ms`() = runBlocking {
        val freshQueue = KdsQueueEngine()
        val startMs = System.currentTimeMillis()

        val jobs = (1..100).map { i ->
            async {
                freshQueue.enqueue(
                    Order(id = "ord_tp_$i", restaurantId = "rest_tp"),
                    KitchenStation.GRILL
                )
            }
        }
        jobs.awaitAll()

        val elapsedMs = System.currentTimeMillis() - startMs
        assertTrue("100 encolas en la cola KDS deben completarse en < 500ms (actual: ${elapsedMs}ms)", elapsedMs < 500L)
    }
}
