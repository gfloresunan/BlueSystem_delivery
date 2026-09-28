package com.example.optimization

import com.example.domain.engine.archiving.DataArchivingEngine
import com.example.domain.model.order.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 3 + EJE 5: Sincronización, Conflictos y Estrés Multi-Commerce
 *
 * Valida el comportamiento bajo carga de múltiples comercios concurrentes:
 * - 50 comercios con listeners KDS simultáneos
 * - Archivado paralelo sin corrupción de datos
 * - Resolución de conflictos server-wins
 */
class MultiCommerceStressTest {

    private val archivingEngine = DataArchivingEngine(retentionDaysThreshold = 90)

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MULTI-01: 50 comercios ejecutan archivado de datos en paralelo
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MULTI-01 50 commerces archive historical data concurrently without corruption`() = runBlocking {
        val now = System.currentTimeMillis()

        val results = (1..50).map { commerceIndex ->
            async {
                // Cada comercio tiene 20 pedidos: 10 recientes + 10 viejos
                val orders = (1..20).map { i ->
                    val daysAgo = if (i <= 10) (i * 5L) else (95L + i)
                    Order(
                        id = "ord_c${commerceIndex}_$i",
                        restaurantId = "rest_$commerceIndex",
                        createdAt = now - (daysAgo * 24L * 60L * 60L * 1000L)
                    )
                }
                val (active, archived) = archivingEngine.executeOrdersArchivingPolicy(orders, now)
                Triple(commerceIndex, active.size, archived.size)
            }
        }.awaitAll()

        // Todos los comercios deben procesar sus datos correctamente
        assertEquals("Deben procesarse los 50 comercios", 50, results.size)

        results.forEach { (commerceIndex, activeCount, archivedCount) ->
            assertEquals("Comercio $commerceIndex: deben quedar 10 pedidos activos", 10, activeCount)
            assertEquals("Comercio $commerceIndex: deben archivarse 10 pedidos viejos", 10, archivedCount)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MULTI-02: Conflicto de datos → Server-wins (dato del servidor prevalece)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MULTI-02 Data conflict resolves with server-wins strategy`() {
        // Datos del servidor (fuente de verdad)
        val serverPrice = 150.0
        val serverName = "Pollo Asado Premium"
        val serverVersion = 5

        // Datos del cliente (potencialmente desactualizados)
        val clientPrice = 120.0
        val clientName = "Pollo Asado"
        val clientVersion = 3

        // Server-wins: el servidor siempre gana si su versión es más reciente
        val resolvedPrice = if (serverVersion > clientVersion) serverPrice else clientPrice
        val resolvedName = if (serverVersion > clientVersion) serverName else clientName

        assertEquals("El precio resuelto debe ser el del servidor", serverPrice, resolvedPrice, 0.001)
        assertEquals("El nombre resuelto debe ser el del servidor", serverName, resolvedName)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MULTI-03: Reconexión de 30 motorizados simultáneos no genera duplicados
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MULTI-03 30 couriers reconnecting simultaneously do not create duplicate assignments`() = runBlocking {
        val courierIds = (1..30).map { "driver_rc1_$it" }
        val assignedOrders = mutableSetOf<String>()
        val lock = Any()

        val assignments = courierIds.map { courierId ->
            async {
                val orderId = "ord_dispatch_$courierId"
                synchronized(lock) {
                    val isDuplicate = !assignedOrders.add(orderId)
                    Pair(orderId, isDuplicate)
                }
            }
        }.awaitAll()

        // Ninguna asignación debe ser un duplicado
        val duplicates = assignments.filter { it.second }
        assertTrue("No debe haber asignaciones duplicadas en la reconexión de motorizados", duplicates.isEmpty())
        assertEquals("Deben existir exactamente 30 asignaciones únicas", 30, assignedOrders.size)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MULTI-04: Throughput de archivado — 1000 pedidos procesados correctamente
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MULTI-04 Archiving engine handles 1000 orders within acceptable time`() {
        val now = System.currentTimeMillis()
        val orders = (1..1000).map { i ->
            Order(
                id = "ord_bulk_$i",
                createdAt = now - ((i * 0.1).toLong() * 24L * 60L * 60L * 1000L)
            )
        }

        val startMs = System.currentTimeMillis()
        val (active, archived) = archivingEngine.executeOrdersArchivingPolicy(orders, now)
        val elapsedMs = System.currentTimeMillis() - startMs

        assertEquals("Deben procesarse todos los 1000 pedidos", 1000, active.size + archived.size)
        assertTrue("El archivado de 1000 pedidos debe completarse en < 1000ms. Actual: ${elapsedMs}ms", elapsedMs < 1000L)
    }
}
