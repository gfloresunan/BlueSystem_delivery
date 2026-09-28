package com.example.presentation.customer.profile

import com.example.Pedido
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderPresentationResolverTest {

    @Test
    fun `test 01 - Restaurant preparing resolves to Pedido en Cocina`() {
        val order = Pedido(
            pedidoId = "ord_rest_123",
            businessName = "Restaurante El Sabor",
            status = "preparing"
        )
        val presentation = OrderPresentationResolver.resolve(order, isRestaurant = true)
        assertEquals("🍳 Pedido en Cocina", presentation.title)
        assertEquals("En cocina", presentation.shortLabel)
        assertEquals("ID del pedido: ord_rest_123", presentation.formattedOrderId)
    }

    @Test
    fun `test 02 - Non-restaurant (Technology) preparing resolves to Tu pedido en Preparacion`() {
        val order = Pedido(
            pedidoId = "ord_tec_456",
            businessName = "TECNOSTORE",
            status = "preparing"
        )
        val presentation = OrderPresentationResolver.resolve(order, isRestaurant = false)
        assertEquals("📦 Tu pedido en Preparación", presentation.title)
        assertEquals("En preparación", presentation.shortLabel)
        assertEquals("ID del pedido: ord_tec_456", presentation.formattedOrderId)
    }

    @Test
    fun `test 03 - Completed status resolves to friendly check title`() {
        val order = Pedido(
            pedidoId = "s26JKFC123",
            status = "completed"
        )
        val presentation = OrderPresentationResolver.resolve(order)
        assertEquals("✓ Pedido completado", presentation.title)
        assertEquals("Completado", presentation.shortLabel)
        assertEquals("ID del pedido: s26JKFC123", presentation.formattedOrderId)
    }

    @Test
    fun `test 04 - Courier accepted status resolves to Repartidor confirmado`() {
        val order = Pedido(
            pedidoId = "ord_courier_789",
            status = "courier_accepted"
        )
        val presentation = OrderPresentationResolver.resolve(order)
        assertEquals("🛵 Repartidor confirmado", presentation.title)
        assertEquals("Repartidor confirmado", presentation.shortLabel)
    }

    @Test
    fun `test 05 - In transit status resolves to Tu pedido esta en camino`() {
        val order = Pedido(
            pedidoId = "ord_transit_101",
            status = "in_transit"
        )
        val presentation = OrderPresentationResolver.resolve(order)
        assertEquals("🛵 Tu pedido está en camino", presentation.title)
        assertEquals("En camino", presentation.shortLabel)
    }

    @Test
    fun `test 06 - Delivered status resolves to Pedido entregado`() {
        val order = Pedido(
            pedidoId = "ord_deliv_202",
            status = "delivered"
        )
        val presentation = OrderPresentationResolver.resolve(order)
        assertEquals("🎉 ¡Pedido entregado!", presentation.title)
        assertEquals("Entregado", presentation.shortLabel)
    }

    @Test
    fun `test 07 - Gastronomy detection rules and safe fallback`() {
        // Gastronomic categories -> true
        assertTrue(OrderPresentationResolver.isGastronomyCategory("Restaurante"))
        assertTrue(OrderPresentationResolver.isGastronomyCategory("Comida Rápida"))
        assertTrue(OrderPresentationResolver.isGastronomyCategory("Cafetería & Panadería"))
        assertTrue(OrderPresentationResolver.isGastronomyCategory("Pizzería"))
        assertTrue(OrderPresentationResolver.isGastronomyCategory(null, "RESTAURANT"))

        // Non-gastronomic categories -> false
        assertFalse(OrderPresentationResolver.isGastronomyCategory("Tecnología"))
        assertFalse(OrderPresentationResolver.isGastronomyCategory("Supermercado"))
        assertFalse(OrderPresentationResolver.isGastronomyCategory("Farmacia"))
        assertFalse(OrderPresentationResolver.isGastronomyCategory("Ropa"))
        assertFalse(OrderPresentationResolver.isGastronomyCategory(null, "TECHNOLOGY"))

        // Unknown / null -> Fallback seguro false
        assertFalse(OrderPresentationResolver.isGastronomyCategory(null, null))
        assertFalse(OrderPresentationResolver.isGastronomyCategory("", ""))
        assertFalse(OrderPresentationResolver.isGastronomyCategory("Misceláneos", ""))
    }

    @Test
    fun `test 08 - Timeline steps generation with progress`() {
        val preparingOrder = Pedido(pedidoId = "ord_tl_1", status = "preparing")
        val steps = OrderPresentationResolver.buildTimelineSteps(preparingOrder, isRestaurant = true)

        assertEquals(5, steps.size)
        assertEquals("✓ Pedido recibido", steps[0].title)
        assertTrue(steps[0].isCompleted)

        assertEquals("🍳 En cocina", steps[1].title)
        assertTrue(steps[1].isCompleted)
        assertTrue(steps[1].isCurrent)

        assertEquals("📦 Pedido listo", steps[2].title)
        assertFalse(steps[2].isCompleted)

        assertEquals("🛵 En camino", steps[3].title)
        assertFalse(steps[3].isCompleted)

        assertEquals("🎉 Entregado", steps[4].title)
        assertFalse(steps[4].isCompleted)
    }
}
