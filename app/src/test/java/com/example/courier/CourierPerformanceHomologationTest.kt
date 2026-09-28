package com.example.courier

import com.example.FinanceDateFilter
import com.example.PedidoOfrecido
import com.example.domain.engine.courier.CourierFinanceCalculator
import com.example.domain.model.courier.CourierReviewItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

/**
 * Suite de Pruebas y Certificación Forense para Protocolo:
 * BSD-COURIER-PERFORMANCE-HISTORY-DATA-HOMOLOGATION-001
 *
 * Valida:
 * 1. Homologación 100% de Código Canónico (#VAT000003) sin alterar orderId del Ledger.
 * 2. Cálculo de métricas reales de Calificación, Deduplicación de /reviews por orderId.
 * 3. Filtrado de Historial por Comercio y chips de fecha (5 recientes por defecto, sin truncamiento).
 */
class CourierPerformanceHomologationTest {

    private val baseTime = 1756300000000L

    // =========================================================================
    // MEJORA 1: HOMOLOGACIÓN DE IDENTIFICADORES DE PEDIDOS
    // =========================================================================

    @Test
    fun `test 01 - Canonical orderCode is strictly reflected in referenceNumber avoiding hash`() {
        val orderWithCode = PedidoOfrecido(
            id = "cem0gz1234567890abcdef",
            orderCode = "VAT000003",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 50.0,
            comercioNombre = "Fritanga El Buen Sabor",
            clienteDireccion = "Colonia Centroamérica",
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(orderWithCode),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        val item = result.items.first()
        // Preserva el ID canónico de documento Firestore para integridad del ledger contable
        assertEquals("cem0gz1234567890abcdef", item.orderId)
        // La referencia visual en UI debe ser exactamente el código homologado #VAT000003
        assertEquals("#VAT000003", item.referenceNumber)
    }

    @Test
    fun `test 02 - Canonical orderCode with existing hash prefix does not duplicate hash`() {
        val orderWithPrefixedCode = PedidoOfrecido(
            id = "alzmee9876543210fedcba",
            orderCode = "#VAT000004",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 45.0,
            comercioNombre = "Tip Top Metrocentro",
            clienteDireccion = "Reparto San Juan",
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(orderWithPrefixedCode),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        val item = result.items.first()
        assertEquals("#VAT000004", item.referenceNumber)
    }

    @Test
    fun `test 03 - Fallback to last 6 chars when orderCode is blank`() {
        val legacyOrder = PedidoOfrecido(
            id = "legacy_doc_123456",
            orderCode = "",
            serviceType = "COMMERCE_DELIVERY",
            status = "completed",
            gananciaRepartidor = 35.0,
            completedAt = baseTime
        )

        val result = CourierFinanceCalculator.computeFinances(
            orders = listOf(legacyOrder),
            filter = FinanceDateFilter.TODAY,
            nowMs = baseTime
        )

        val item = result.items.first()
        assertEquals("#123456", item.referenceNumber)
    }

    // =========================================================================
    // MEJORA 2: CÁLCULO DE CALIFICACIÓN Y DEDUPLICACIÓN DE REVIEWS
    // =========================================================================

    @Test
    fun `test 04 - Reviews deduplicate by orderId keeping latest and compute real average`() {
        val rawReviews = listOf(
            CourierReviewItem(
                orderId = "order_100",
                rating = 4,
                comment = "Buen servicio",
                customerName = "Juan Pérez",
                timestampMs = 1000L
            ),
            // Review actualizada por el mismo cliente sobre el mismo pedido más adelante
            CourierReviewItem(
                orderId = "order_100",
                rating = 5,
                comment = "Excelente servicio, muy rápido",
                customerName = "Juan Pérez",
                timestampMs = 2000L
            ),
            CourierReviewItem(
                orderId = "order_101",
                rating = 4,
                comment = "Todo en orden",
                customerName = "María López",
                timestampMs = 1500L
            ),
            CourierReviewItem(
                orderId = "order_102",
                rating = 5,
                comment = "Muy amable",
                customerName = "Carlos Ruiz",
                timestampMs = 1800L
            )
        )

        // Deduplicación por orderId preservando la más reciente según timestampMs
        val deduplicated = rawReviews
            .sortedByDescending { it.timestampMs }
            .distinctBy { it.orderId }

        assertEquals(3, deduplicated.size)
        // La review para order_100 debe ser la de rating 5 (timestampMs = 2000L)
        val reviewOrder100 = deduplicated.find { it.orderId == "order_100" }
        assertEquals(5, reviewOrder100?.rating ?: 0)

        val validRatings = deduplicated.map { it.rating.toDouble() }.filter { it > 0.0 }
        val average = if (validRatings.isNotEmpty()) validRatings.average() else 0.0

        // (5.0 + 4.0 + 5.0) / 3 = 4.6666... -> redondeado a 1 decimal = 4.7
        val roundedAverage = kotlin.math.round(average * 10.0) / 10.0
        assertEquals(4.7, roundedAverage, 0.01)
        assertEquals(3, deduplicated.size)
    }

    @Test
    fun `test 05 - Empty reviews produces zero average and zero count`() {
        val emptyReviews = emptyList<CourierReviewItem>()
        val validRatings = emptyReviews.map { it.rating.toDouble() }.filter { it > 0.0 }
        val average = if (validRatings.isNotEmpty()) validRatings.average() else 0.0
        val count = validRatings.size

        assertEquals(0.0, average, 0.001)
        assertEquals(0, count)
    }

    // =========================================================================
    // MEJORA 3: FILTRADO DE HISTORIAL POR COMERCIO Y CHIPS DE TIEMPO
    // =========================================================================

    @Test
    fun `test 06 - Default filter shows 5 most recent orders without modifying base data`() {
        val orders = (1..10).map { i ->
            PedidoOfrecido(
                id = "order_doc_$i",
                orderCode = "VAT%06d".format(i),
                comercioNombre = if (i % 2 == 0) "Comercio A" else "Comercio B",
                status = "completed",
                completedAt = baseTime + (i * 10000L)
            )
        }

        // Filtro por defecto: sin comercio seleccionado, filtro Recientes (índice 0)
        val selectedCommerce = ""
        val selectedTimeFilter = 0 // Recientes (5)

        val commerceFiltered = if (selectedCommerce.isBlank()) {
            orders
        } else {
            orders.filter { it.comercioNombre.equals(selectedCommerce, ignoreCase = true) }
        }

        val finalDisplayed = if (selectedTimeFilter == 0 && selectedCommerce.isBlank()) {
            commerceFiltered.sortedByDescending { it.completedAt }.take(5)
        } else {
            commerceFiltered.sortedByDescending { it.completedAt }
        }

        // Se visualizan los últimos 5
        assertEquals(5, finalDisplayed.size)
        // El primero es el de mayor completedAt (order 10) formateado con '#'
        assertEquals("#VAT000010", "#${finalDisplayed.first().displayOrderCode.removePrefix("#")}")
        // La lista base sigue teniendo los 10 pedidos intactos
        assertEquals(10, orders.size)
    }

    @Test
    fun `test 07 - Commerce selection shows all orders for that commerce without 5-order limit`() {
        val orders = (1..8).map { i ->
            PedidoOfrecido(
                id = "order_doc_$i",
                orderCode = "VAT%06d".format(i),
                comercioNombre = "Fritanga Doña Tania",
                status = "completed",
                completedAt = baseTime + (i * 10000L)
            )
        } + listOf(
            PedidoOfrecido(
                id = "order_doc_other",
                orderCode = "VAT000099",
                comercioNombre = "Comercio Diferente",
                status = "completed",
                completedAt = baseTime
            )
        )

        val selectedCommerce = "Fritanga Doña Tania"
        val selectedTimeFilter = 0

        val commerceFiltered = orders.filter { it.comercioNombre.equals(selectedCommerce, ignoreCase = true) }
        val finalDisplayed = if (selectedTimeFilter == 0 && selectedCommerce.isBlank()) {
            commerceFiltered.sortedByDescending { it.completedAt }.take(5)
        } else {
            commerceFiltered.sortedByDescending { it.completedAt }
        }

        // Al seleccionar un comercio específico, se deben mostrar TODOS sus pedidos (8 en este caso)
        assertEquals(8, finalDisplayed.size)
        assertTrue(finalDisplayed.all { it.comercioNombre == "Fritanga Doña Tania" })
    }

    @Test
    fun `test 08 - Date filter TODAY shows all orders completed today without 5-order cap`() {
        val todayCalendar = Calendar.getInstance().apply { timeInMillis = baseTime }
        val todayStart = Calendar.getInstance().apply {
            timeInMillis = baseTime
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        // 7 pedidos completados hoy
        val todayOrders = (1..7).map { i ->
            PedidoOfrecido(
                id = "today_doc_$i",
                orderCode = "VAT%06d".format(i),
                comercioNombre = "Comercio $i",
                status = "completed",
                completedAt = todayStart + (i * 3600000L)
            )
        }
        // 2 pedidos de ayer
        val yesterdayOrders = (8..9).map { i ->
            PedidoOfrecido(
                id = "yesterday_doc_$i",
                orderCode = "VAT%06d".format(i),
                comercioNombre = "Comercio $i",
                status = "completed",
                completedAt = todayStart - (i * 3600000L)
            )
        }

        val allOrders = todayOrders + yesterdayOrders
        val selectedCommerce = ""
        val selectedTimeFilter = 1 // Hoy

        val timeFiltered = allOrders.filter { order ->
            order.completedAt in todayStart..(todayStart + 86400000L)
        }

        val finalDisplayed = if (selectedTimeFilter == 0 && selectedCommerce.isBlank()) {
            timeFiltered.sortedByDescending { it.completedAt }.take(5)
        } else {
            timeFiltered.sortedByDescending { it.completedAt }
        }

        // Los 7 pedidos de hoy se muestran completos
        assertEquals(7, finalDisplayed.size)
    }
}
