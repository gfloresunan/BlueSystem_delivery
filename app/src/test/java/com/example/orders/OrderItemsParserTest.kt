package com.example.orders

import com.example.Pedido
import com.example.parseOrderItems
import com.example.presentation.customer.profile.OrderItem
import org.junit.Assert.*
import org.junit.Test

class OrderItemsParserTest {

    @Test
    fun test01_singleProduct() {
        val raw = listOf(
            mapOf("productId" to "p1", "productName" to "Hamburguesa Clásica", "price" to 150.0, "quantity" to 1)
        )
        val items = parseOrderItems(raw)
        assertEquals(1, items.size)
        assertEquals("p1", items[0].productId)
        assertEquals("Hamburguesa Clásica", items[0].name)
    }

    @Test
    fun test02_multipleProducts() {
        val raw = listOf(
            mapOf("productId" to "p1", "productName" to "Pizza Margarita", "price" to 220.0, "quantity" to 2),
            mapOf("productId" to "p2", "productName" to "Refresco 500ml", "price" to 35.0, "quantity" to 2)
        )
        val items = parseOrderItems(raw)
        assertEquals(2, items.size)
        assertEquals(2, items[0].quantity)
        assertEquals(2, items[1].quantity)
    }

    @Test
    fun test03_productNamePresent() {
        val raw = listOf(
            mapOf("productId" to "p3", "productName" to "Tacos al Pastor", "price" to 120.0, "quantity" to 3)
        )
        val items = parseOrderItems(raw)
        assertEquals("Tacos al Pastor", items[0].name)
    }

    @Test
    fun test04_productNameAbsent_namePresent() {
        val raw = listOf(
            mapOf("productId" to "p4", "name" to "Burrito de Res", "price" to 95.0, "quantity" to 1)
        )
        val items = parseOrderItems(raw)
        assertEquals("Burrito de Res", items[0].name)
    }

    @Test
    fun test05_imageUrlPresent() {
        val raw = listOf(
            mapOf("productId" to "p5", "productName" to "Ensalada César", "price" to 80.0, "quantity" to 1, "imageUrl" to "https://cdn.example.com/salad.jpg")
        )
        val items = parseOrderItems(raw)
        assertEquals("https://cdn.example.com/salad.jpg", items[0].imageUrl)
    }

    @Test
    fun test06_imageUrlAbsent_noCrash() {
        val raw = listOf(
            mapOf("productId" to "p6", "productName" to "Agua Mineral", "price" to 25.0, "quantity" to 1)
        )
        val items = parseOrderItems(raw)
        assertEquals("", items[0].imageUrl)
    }

    @Test
    fun test07_quantityPresent() {
        val raw = listOf(
            mapOf("productId" to "p7", "productName" to "Alitas BBQ", "price" to 180.0, "quantity" to 4)
        )
        val items = parseOrderItems(raw)
        assertEquals(4, items[0].quantity)
    }

    @Test
    fun test08_pricePresent() {
        val raw = listOf(
            mapOf("productId" to "p8", "productName" to "Combo Familiar", "price" to 450.50, "quantity" to 1)
        )
        val items = parseOrderItems(raw)
        assertEquals(450.50, items[0].price, 0.001)
    }

    @Test
    fun test09_subtotalPresent() {
        val raw = listOf(
            mapOf("productId" to "p9", "productName" to "Combo Pareja", "price" to 200.0, "quantity" to 2, "subtotal" to 400.0)
        )
        val items = parseOrderItems(raw)
        assertEquals(400.0, items[0].subtotal, 0.001)
    }

    @Test
    fun test10_itemsAbsentNull_emptyListNoCrash() {
        val items = parseOrderItems(null)
        assertNotNull(items)
        assertTrue(items.isEmpty())
    }

    @Test
    fun test11_itemsEmpty_emptyListNoCrash() {
        val items = parseOrderItems(emptyList<Any>())
        assertNotNull(items)
        assertTrue(items.isEmpty())
    }

    @Test
    fun test12_partiallyIncompleteItem_recoversValidItems() {
        val raw = listOf(
            mapOf("productId" to "p12_valid1", "productName" to "Sopa Azteca", "price" to 75.0, "quantity" to 1),
            mapOf("unknownField" to "invalidData"),
            mapOf("productId" to "p12_valid2", "productName" to "Flan Casero", "price" to 45.0, "quantity" to 1)
        )
        val items = parseOrderItems(raw)
        assertEquals(2, items.size)
        assertEquals("p12_valid1", items[0].productId)
        assertEquals("p12_valid2", items[1].productId)
    }

    @Test
    fun test13_orderWithItems_historyIntegrity() {
        val parsedItems = parseOrderItems(
            listOf(mapOf("productId" to "p13", "productName" to "Pastel de Chocolate", "price" to 60.0, "quantity" to 1))
        )
        val pedido = Pedido(pedidoId = "ord-13", items = parsedItems)
        assertEquals(1, pedido.items.size)
        assertEquals("Pastel de Chocolate", pedido.items[0].name)
    }

    @Test
    fun test14_orderDetail_itemsNotEmpty() {
        val raw = listOf(mapOf("productId" to "p14", "productName" to "Jugo Natural", "price" to 40.0, "quantity" to 2))
        val pedido = Pedido(pedidoId = "ord-14", items = parseOrderItems(raw))
        assertTrue(pedido.items.isNotEmpty())
        assertEquals(2, pedido.items[0].quantity)
    }

    @Test
    fun test15_reorder_reconstructible() {
        val raw = listOf(
            mapOf("productId" to "prod_abc", "productName" to "Empanadas", "price" to 30.0, "quantity" to 3)
        )
        val items = parseOrderItems(raw)
        val item = items.first()
        assertEquals("prod_abc", item.productId)
        assertEquals("Empanadas", item.name)
        assertEquals(3, item.quantity)
        assertEquals(30.0, item.price, 0.001)
    }

    @Test
    fun test16_favorite_receivesCorrectProductId() {
        val raw = listOf(
            mapOf("productId" to "prod_fav_99", "productName" to "Pizza Especial", "price" to 250.0, "quantity" to 1)
        )
        val items = parseOrderItems(raw)
        val item = items.first()
        val prodId = if (item.productId.isNotBlank()) item.productId else item.name.trim().lowercase().replace(" ", "_")
        assertEquals("prod_fav_99", prodId)
    }
}
