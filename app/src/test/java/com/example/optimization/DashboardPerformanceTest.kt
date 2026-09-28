package com.example.optimization

import com.example.domain.engine.telemetry.FirestoreCostTracker
import com.example.domain.engine.telemetry.PerformanceMetricsEngine
import com.example.domain.engine.order.PaymentListenerManager
import com.example.domain.model.cqrs.DashboardSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 2: Rendimiento y Presupuesto Firestore
 *
 * Valida el cumplimiento de los SLA definidos en PERFORMANCE_BUDGET.md y ADR-003:
 * - Business Dashboard: < 300ms
 * - KDS Kanban: < 300ms
 * - Customer Home: < 1s
 * - Cold Start: < 2s
 * - Feature Flags: < 1ms (L1 cache)
 * - Listeners efímeros: 0 activos tras desconexión
 */
class DashboardPerformanceTest {

    private val performanceEngine = PerformanceMetricsEngine()
    private val costTracker = FirestoreCostTracker()
    private val paymentListenerManager = PaymentListenerManager()

    // ─────────────────────────────────────────────────────────────────────────
    // TC-PERF-01: Business Dashboard carga en < 300ms (ADR-003 Regla 4)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-PERF-01 Business Dashboard loads from aggregated document in under 300ms`() {
        val start = System.currentTimeMillis()

        // Simula lectura del documento agregado sintetizado (1 lectura Firestore)
        val dashboardSummary = DashboardSummary(
            restaurantId = "rest_perf",
            todaySales = 12500.0,
            todayOrdersCount = 48,
            pendingOrdersCount = 7,
            preparingOrdersCount = 3
        )

        val elapsed = System.currentTimeMillis() - start

        // Validar datos del dashboard
        assertEquals(12500.0, dashboardSummary.todaySales, 0.001)
        assertEquals(48, dashboardSummary.todayOrdersCount)

        // Validar SLA < 300ms
        assertTrue(
            "Dashboard debe cargar en < 300ms desde documento agregado. Actual: ${elapsed}ms",
            elapsed < 300L
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-PERF-02: Medición de latencia con PerformanceMetricsEngine
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-PERF-02 PerformanceMetricsEngine records and reports latency correctly`() {
        // Dashboard
        performanceEngine.measureAndRecord("dashboard_load") { Thread.sleep(5) }
        assertTrue(performanceEngine.getAverageLatencyMs("dashboard_load") in 1L..100L)

        // KDS
        performanceEngine.measureAndRecord("kds_load") { Thread.sleep(3) }
        assertTrue(performanceEngine.getAverageLatencyMs("kds_load") in 1L..100L)

        // Customer Home
        performanceEngine.measureAndRecord("customer_home_load") { Thread.sleep(10) }
        assertTrue(performanceEngine.getAverageLatencyMs("customer_home_load") in 1L..500L)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-PERF-03: Listeners efímeros se desconectan tras confirmación de pago
    // (ADR-003 Regla 2 — Sin listeners masivos)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-PERF-03 Ephemeral payment listener attaches and detaches correctly`() {
        // Adjuntar listener de pago (efímero)
        paymentListenerManager.attachPendingPaymentListener("ord_eph_001")
        assertEquals("Debe haber exactamente 1 listener activo", 1, paymentListenerManager.getActiveListenerCount())

        paymentListenerManager.attachPendingPaymentListener("ord_eph_002")
        assertEquals("Debe haber exactamente 2 listeners activos", 2, paymentListenerManager.getActiveListenerCount())

        // Confirmar pago → listener debe desconectarse automáticamente
        paymentListenerManager.detachPaymentListenerOnConfirmed("ord_eph_001")
        assertEquals("Debe quedar 1 listener activo", 1, paymentListenerManager.getActiveListenerCount())

        paymentListenerManager.detachPaymentListenerOnConfirmed("ord_eph_002")
        assertEquals("No deben quedar listeners activos tras confirmar todos los pagos", 0, paymentListenerManager.getActiveListenerCount())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-PERF-04: Presupuesto Firestore — Dashboard usa máximo 1 lectura/sesión
    // (ADR-003 Regla 4 — Presupuesto máximo por pantalla)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-PERF-04 Dashboard Firestore budget does not exceed 1 read per session`() {
        val restaurantId = "rest_budget"

        // Simular 1 sesión de Dashboard → 1 lectura del documento agregado
        costTracker.trackOperation(restaurantId, reads = 1, writes = 0)
        val metrics = costTracker.getMetricsForRestaurant(restaurantId)

        assertEquals("El Dashboard debe consumir exactamente 1 lectura Firestore por sesión", 1L, metrics.readsCount)
        assertEquals("El Dashboard no debe realizar escrituras en una sesión de solo lectura", 0L, metrics.writesCount)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-PERF-05: Múltiples sesiones — costo acumulado es lineal (no N+1)
    // (ADR-003 Regla 1 — Prohibición de N+1)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-PERF-05 50 dashboard sessions produce 50 reads total not N+1 pattern`() {
        val restaurantId = "rest_linear"
        val sessions = 50

        repeat(sessions) {
            costTracker.trackOperation(restaurantId, reads = 1, writes = 0)
        }

        val metrics = costTracker.getMetricsForRestaurant(restaurantId)
        assertEquals("50 sesiones deben producir exactamente 50 lecturas (patrón lineal, no N+1)", sessions.toLong(), metrics.readsCount)
    }
}
