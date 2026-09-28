package com.example.optimization

import com.example.data.cache.CacheLevel
import com.example.data.cache.MultiLevelCacheManager
import com.example.domain.engine.archiving.DataArchivingEngine
import com.example.domain.model.order.Order
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 2: Auditoría de Presupuesto Firestore y Caché Multi-nivel
 *
 * Verifica el cumplimiento de ADR-003 Reglas 1–5:
 * - Caché L1 evita descargas redundantes de menú
 * - Archivado automático de datos > 90 días
 * - Sin patrones N+1 en carga de menús cliente
 */
class FirestoreBudgetAuditTest {

    private val cacheManager = MultiLevelCacheManager()
    private val archivingEngine = DataArchivingEngine(retentionDaysThreshold = 90)

    // ─────────────────────────────────────────────────────────────────────────
    // TC-CACHE-01: App cliente no descarga menú si la versión no cambió
    // (ADR-003 Regla — Caché inteligente de menú)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-CACHE-01 Customer app does not re-download menu if version unchanged`() = runBlocking {
        val restaurantId = "rest_cache_audit"
        val menuVersion = 5L

        // Primera carga → viene de Firestore (L3)
        val fetch1 = cacheManager.getOrFetchCustomerMenu(restaurantId, menuVersion) { "MenuContentV5" }
        assertEquals("Primera carga debe venir de Firestore (L3)", CacheLevel.L3_FIRESTORE, fetch1.levelServedFrom)

        // Segunda carga misma versión → viene de Caché L1 (en memoria)
        val fetch2 = cacheManager.getOrFetchCustomerMenu(restaurantId, menuVersion) { "MenuContentV5" }
        assertEquals("Segunda carga debe venir del caché L1 en memoria", CacheLevel.L1_MEMORY, fetch2.levelServedFrom)

        // Tercera carga misma versión → L1 nuevamente
        val fetch3 = cacheManager.getOrFetchCustomerMenu(restaurantId, menuVersion) { "MenuContentV5" }
        assertEquals("Tercera carga debe venir del caché L1", CacheLevel.L1_MEMORY, fetch3.levelServedFrom)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-CACHE-02: Cambio de versión de menú invalida caché y descarga nuevo contenido
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-CACHE-02 Menu version change invalidates cache and triggers fresh download`() = runBlocking {
        val restaurantId = "rest_cache_invalidate"

        // Versión 3 en caché
        val fetchV3 = cacheManager.getOrFetchCustomerMenu(restaurantId, 3L) { "MenuContentV3" }
        assertEquals("V3 debe descargarse de Firestore", CacheLevel.L3_FIRESTORE, fetchV3.levelServedFrom)

        // Servidor actualiza el menú → versión 4
        val fetchV4 = cacheManager.getOrFetchCustomerMenu(restaurantId, 4L) { "MenuContentV4" }
        assertEquals("V4 (nueva versión) debe descargarse de Firestore, no del caché", CacheLevel.L3_FIRESTORE, fetchV4.levelServedFrom)

        // Verificar que el contenido es el correcto para V4
        assertEquals("MenuContentV4", fetchV4.data)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-CACHE-03: 100 clientes con la misma versión → solo 1 descarga real (por restaurant)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-CACHE-03 100 customers sharing same menu version produce only 1 Firestore read`() = runBlocking {
        val restaurantId = "rest_shared_menu"
        val version = 10L
        var firestoreCallCount = 0

        // Primer cliente descarga el menú
        cacheManager.getOrFetchCustomerMenu(restaurantId, version) {
            firestoreCallCount++
            "SharedMenuContent"
        }

        // 99 clientes adicionales leen del caché
        for (i in 2..100) {
            cacheManager.getOrFetchCustomerMenu(restaurantId, version) {
                firestoreCallCount++
                "SharedMenuContent"
            }
        }

        // Solo debe haberse llamado a Firestore 1 vez (la primera)
        assertEquals("100 clientes con misma versión deben producir solo 1 lectura Firestore", 1, firestoreCallCount)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-ARCHIVE-01: Pedidos > 90 días se archivan automáticamente
    // (ADR-003 Regla 3 — Archivado obligatorio)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-ARCHIVE-01 Orders older than 90 days are automatically archived`() {
        val now = System.currentTimeMillis()
        val msIn90Days = 90L * 24L * 60L * 60L * 1000L

        val recentOrder = Order(id = "recent_001", createdAt = now - (30L * 24L * 60L * 60L * 1000L)) // 30 días
        val oldOrder1 = Order(id = "old_001", createdAt = now - (95L * 24L * 60L * 60L * 1000L)) // 95 días
        val oldOrder2 = Order(id = "old_002", createdAt = now - (120L * 24L * 60L * 60L * 1000L)) // 120 días

        val (active, archived) = archivingEngine.executeOrdersArchivingPolicy(
            listOf(recentOrder, oldOrder1, oldOrder2), now
        )

        assertEquals("Solo los pedidos recientes deben permanecer activos", 1, active.size)
        assertEquals("recent_001", active[0].id)

        assertEquals("Los pedidos > 90 días deben archivarse", 2, archived.size)
        assertTrue("old_001 debe estar archivado", archived.any { it.id == "old_001" })
        assertTrue("old_002 debe estar archivado", archived.any { it.id == "old_002" })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-ARCHIVE-02: Colección activa nunca supera el umbral de retención
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-ARCHIVE-02 Active orders collection stays within retention policy after archiving`() {
        val now = System.currentTimeMillis()
        val allOrders = (1..200).map { i ->
            val daysAgo = if (i <= 100) (i * 1L) else (91L + i) // 100 recientes + 100 viejos
            Order(id = "ord_$i", createdAt = now - (daysAgo * 24L * 60L * 60L * 1000L))
        }

        val (active, archived) = archivingEngine.executeOrdersArchivingPolicy(allOrders, now)

        assertTrue("La colección activa debe contener solo pedidos dentro del período de retención", active.size <= 100)
        assertTrue("Los pedidos archivados no deben estar en la colección activa",
            active.none { order -> archived.any { it.id == order.id } })
    }
}
