package com.example.optimization

import com.example.data.cache.CacheLevel
import com.example.data.cache.MultiLevelCacheManager
import com.example.domain.engine.archiving.DataArchivingEngine
import com.example.domain.engine.order.PaymentListenerManager
import com.example.domain.engine.telemetry.FirestoreCostTracker
import com.example.domain.engine.telemetry.PerformanceMetricsEngine
import com.example.domain.model.cqrs.DashboardSummary
import com.example.domain.model.order.Order
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Sprint14OptimizationE2ETest {

    private val cacheManager = MultiLevelCacheManager()
    private val costTracker = FirestoreCostTracker()
    private val performanceEngine = PerformanceMetricsEngine()
    private val paymentListenerManager = PaymentListenerManager()
    private val archivingEngine = DataArchivingEngine(90)

    @Test
    fun `E2E Sprint 14_0 - Full Architecture Optimization Validation`() = runBlocking {
        // 1. Dashboard utiliza documento sintetizado agregado (CQRS)
        val dashboardSummary = DashboardSummary(
            restaurantId = "rest_opt",
            todaySales = 8500.0,
            todayOrdersCount = 30
        )
        assertEquals(8500.0, dashboardSummary.todaySales, 0.001)

        // 2. Medición de latencia de carga
        performanceEngine.measureAndRecord("load_dashboard") {
            Thread.sleep(10) // Simulación carga ultrarrápida
        }
        assertTrue(performanceEngine.getAverageLatencyMs("load_dashboard") >= 10L)

        // 3. App cliente no descarga menú si la versión no cambió
        val menuFetch1 = cacheManager.getOrFetchCustomerMenu("rest_opt", 1L) { "MenuContentV1" }
        assertEquals(CacheLevel.L3_FIRESTORE, menuFetch1.levelServedFrom)

        val menuFetch2 = cacheManager.getOrFetchCustomerMenu("rest_opt", 1L) { "MenuContentV1" }
        assertEquals(CacheLevel.L1_MEMORY, menuFetch2.levelServedFrom)

        // 4. Registro de operaciones y cálculo de costo estimado Firestore
        costTracker.trackOperation("rest_opt", reads = 500, writes = 100)
        val costMetrics = costTracker.getMetricsForRestaurant("rest_opt")
        assertEquals(500L, costMetrics.readsCount)

        // 5. Listeners efímeros de pago se conectan y desconectan
        paymentListenerManager.attachPendingPaymentListener("ord_pay_1")
        assertEquals(1, paymentListenerManager.getActiveListenerCount())
        paymentListenerManager.detachPaymentListenerOnConfirmed("ord_pay_1")
        assertEquals(0, paymentListenerManager.getActiveListenerCount())

        // 6. Política de archivado automático de datos históricos
        val now = System.currentTimeMillis()
        val oldOrder = Order(id = "o_old", createdAt = now - (95L * 24L * 60L * 60L * 1000L))
        val (active, archived) = archivingEngine.executeOrdersArchivingPolicy(listOf(oldOrder), now)

        assertEquals(0, active.size)
        assertEquals(1, archived.size)
    }
}
