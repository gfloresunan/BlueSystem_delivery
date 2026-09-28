package com.example.kds

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.engine.order.OrderValidationEngine
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.order.Order
import com.example.domain.model.order.OrderItem
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderValidationEngineTest {

    private val engine = OrderValidationEngine()

    @Test
    fun `test order validation succeeds against valid snapshot`() {
        val cat = MenuCategory(id = "c1", primaryName = "Cat 1", restaurantId = "r1")
        val prod = MenuProduct(id = "p1", name = "Burger", restaurantId = "r1")
        val checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(listOf(cat), listOf(prod))

        val snapshot = MenuSnapshot(
            restaurantId = "r1",
            categories = listOf(cat),
            products = listOf(prod),
            sha256Checksum = checksum
        )

        val order = Order(
            restaurantId = "r1",
            items = listOf(OrderItem(id = "i1", productId = "p1", productName = "Burger"))
        )

        val result = engine.validateOrderAgainstSnapshot(order, snapshot)
        assertTrue(result.isValid)
    }

    @Test
    fun `test order validation fails when product is not in snapshot`() {
        val cat = MenuCategory(id = "c1", primaryName = "Cat 1", restaurantId = "r1")
        val prod = MenuProduct(id = "p1", name = "Burger", restaurantId = "r1")

        val snapshot = MenuSnapshot(
            restaurantId = "r1",
            categories = listOf(cat),
            products = listOf(prod)
        )

        val order = Order(
            restaurantId = "r1",
            items = listOf(OrderItem(id = "i1", productId = "p99", productName = "Ghost Item"))
        )

        val result = engine.validateOrderAgainstSnapshot(order, snapshot)
        assertFalse(result.isValid)
        assertTrue(result.errors.any { it.contains("no existe en el snapshot") })
    }
}
