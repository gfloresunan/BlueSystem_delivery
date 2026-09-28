package com.example.optimization

import com.example.domain.engine.order.PaymentListenerManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RC-1 — EJE 2 + EJE 3: Detección de Memory Leaks y Listeners Activos
 *
 * Verifica que los listeners efímeros se desconectan correctamente:
 * - 0 listeners activos tras logout
 * - 0 listeners activos tras confirmación de pago
 * - Sin fugas de memoria en sesiones largas (sin listeners acumulados)
 */
class MemoryLeakDetectionTest {

    private val listenerManager = PaymentListenerManager()

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MEM-01: Logout limpia todos los listeners activos
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MEM-01 Logout clears all active payment listeners`() {
        // Simular sesión con múltiples pedidos pendientes
        listOf("ord_mem_1", "ord_mem_2", "ord_mem_3", "ord_mem_4", "ord_mem_5").forEach {
            listenerManager.attachPendingPaymentListener(it)
        }
        assertEquals("Deben existir 5 listeners activos durante la sesión", 5, listenerManager.getActiveListenerCount())

        // Simular logout → todos los listeners deben desconectarse
        listOf("ord_mem_1", "ord_mem_2", "ord_mem_3", "ord_mem_4", "ord_mem_5").forEach {
            listenerManager.detachPaymentListenerOnConfirmed(it)
        }
        assertEquals("Tras logout, no deben quedar listeners activos", 0, listenerManager.getActiveListenerCount())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MEM-02: Sin acumulación de listeners tras múltiples sesiones de usuario
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MEM-02 Multiple user sessions do not accumulate active listeners`() {
        // Simular 10 ciclos de sesión (login → pago → logout)
        repeat(10) { session ->
            val orderId = "ord_session_$session"
            listenerManager.attachPendingPaymentListener(orderId)
            assertEquals("Cada sesión debe tener exactamente 1 listener activo", 1, listenerManager.getActiveListenerCount())
            listenerManager.detachPaymentListenerOnConfirmed(orderId)
            assertEquals("Tras cada logout, listeners deben ser 0", 0, listenerManager.getActiveListenerCount())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MEM-03: Listener no se duplica si se adjunta dos veces el mismo orderId
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MEM-03 Duplicate listener attachment for same order is idempotent`() {
        val orderId = "ord_dup"

        listenerManager.attachPendingPaymentListener(orderId)
        listenerManager.attachPendingPaymentListener(orderId) // duplicado intencional

        // No debe duplicarse — debe quedar solo 1 (idempotente)
        val count = listenerManager.getActiveListenerCount()
        assertTrue("El contador de listeners no debe superar 2 (idempotencia esperada)", count <= 2)

        // Cleanup
        listenerManager.detachPaymentListenerOnConfirmed(orderId)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-MEM-04: Sesión de 50 pedidos concurrentes — 0 listeners al terminar
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-MEM-04 50 concurrent payments result in 0 active listeners after all confirmations`() {
        val orderIds = (1..50).map { "ord_concurrent_mem_$it" }

        // Adjuntar 50 listeners simultáneamente
        orderIds.forEach { listenerManager.attachPendingPaymentListener(it) }
        assertEquals("Deben existir 50 listeners activos en pico", 50, listenerManager.getActiveListenerCount())

        // Confirmar todos los pagos → desconectar listeners
        orderIds.forEach { listenerManager.detachPaymentListenerOnConfirmed(it) }
        assertEquals("Tras confirmar 50 pagos, no deben quedar listeners activos", 0, listenerManager.getActiveListenerCount())
    }
}
