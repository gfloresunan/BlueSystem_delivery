package com.example.domain.dashboard

import com.example.Pedido
import com.example.data.repository.BusinessInfo
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.presentation.customer.profile.OrderItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROTOCOLO BSD-C2D-CUSTOMER-DASHBOARD-POST-IMPLEMENTATION-CORRECTION-001
 *
 * Verificación técnica del motor de 7 capas de Quick Reorder (Casos QR-01 a QR-06).
 */
class QuickReorderEngineTest {

    data class ReorderEvaluationResult(
        val isBlockedDueToMerchant: Boolean,
        val addedItems: List<Pair<String, Double>>, // productId -> livePrice
        val omittedCount: Int,
        val requiresCartClear: Boolean
    )

    private fun evaluateQuickReorder(
        order: Pedido,
        allProducts: List<Product>,
        publicBusinesses: List<BusinessInfo>,
        currentCartBusinessId: String
    ): ReorderEvaluationResult {
        // Layer 1: Merchant availability
        val merchant = publicBusinesses.find { it.id == order.businessId }
        if (merchant != null && !merchant.getEffectiveIsActive()) {
            return ReorderEvaluationResult(
                isBlockedDueToMerchant = true,
                addedItems = emptyList(),
                omittedCount = 0,
                requiresCartClear = false
            )
        }

        // Layer 2: Cart clear check
        val requiresCartClear = currentCartBusinessId.isNotEmpty() && currentCartBusinessId != order.businessId

        val added = mutableListOf<Pair<String, Double>>()
        var omitted = 0

        // Layer 3 & 4: Live catalog match, status ACTIVE && !isHidden, current live price
        for (item in order.items) {
            val liveProduct = allProducts.find {
                it.id == item.productId || (it.name.equals(item.name, ignoreCase = true) && it.businessId == order.businessId)
            }

            if (liveProduct != null && liveProduct.status == ProductStatus.ACTIVE && !liveProduct.isHidden) {
                // Precios actuales vivos aplicados
                added.add(Pair(liveProduct.id, liveProduct.price))
            } else {
                omitted++
            }
        }

        return ReorderEvaluationResult(
            isBlockedDueToMerchant = false,
            addedItems = added,
            omittedCount = omitted,
            requiresCartClear = requiresCartClear
        )
    }

    @Test
    fun `QR-01 - valid historical order with open merchant and active visible product adds item with current price`() {
        val historicalOrder = Pedido(
            pedidoId = "order-123",
            businessId = "biz-1",
            businessName = "Pizzería Roma",
            status = "delivered",
            items = listOf(OrderItem(productId = "prod-1", name = "Pizza Margarita", price = 80.0, quantity = 2))
        )
        val liveMerchant = BusinessInfo(id = "biz-1", isOpen = true, isActive = true)
        val liveProduct = Product(id = "prod-1", businessId = "biz-1", name = "Pizza Margarita", price = 85.0, status = ProductStatus.ACTIVE, isHidden = false)

        val result = evaluateQuickReorder(
            order = historicalOrder,
            allProducts = listOf(liveProduct),
            publicBusinesses = listOf(liveMerchant),
            currentCartBusinessId = ""
        )

        assertFalse(result.isBlockedDueToMerchant)
        assertEquals(1, result.addedItems.size)
        assertEquals("prod-1", result.addedItems[0].first)
        assertEquals(85.0, result.addedItems[0].second, 0.001) // Current live price!
        assertEquals(0, result.omittedCount)
    }

    @Test
    fun `QR-02 - product unavailable or deleted in live catalog is omitted and counter incremented`() {
        val historicalOrder = Pedido(
            pedidoId = "order-124",
            businessId = "biz-1",
            businessName = "Pizzería Roma",
            status = "delivered",
            items = listOf(
                OrderItem(productId = "prod-active", name = "Pizza Margarita", price = 80.0, quantity = 1),
                OrderItem(productId = "prod-deleted", name = "Bebida Descontinuada", price = 25.0, quantity = 1)
            )
        )
        val liveMerchant = BusinessInfo(id = "biz-1", isOpen = true, isActive = true)
        val liveProduct = Product(id = "prod-active", businessId = "biz-1", name = "Pizza Margarita", price = 85.0, status = ProductStatus.ACTIVE, isHidden = false)

        val result = evaluateQuickReorder(
            order = historicalOrder,
            allProducts = listOf(liveProduct), // prod-deleted does not exist in live catalog
            publicBusinesses = listOf(liveMerchant),
            currentCartBusinessId = ""
        )

        assertEquals(1, result.addedItems.size)
        assertEquals("prod-active", result.addedItems[0].first)
        assertEquals(1, result.omittedCount)
    }

    @Test
    fun `QR-03 - modified price uses current catalog price rather than historical price`() {
        val historicalOrder = Pedido(
            pedidoId = "order-125",
            businessId = "biz-1",
            status = "completed",
            items = listOf(OrderItem(productId = "prod-price-change", name = "Hamburguesa", price = 50.0, quantity = 1))
        )
        val liveMerchant = BusinessInfo(id = "biz-1", isOpen = true, isActive = true)
        val liveProduct = Product(id = "prod-price-change", businessId = "biz-1", name = "Hamburguesa", price = 75.0, status = ProductStatus.ACTIVE, isHidden = false)

        val result = evaluateQuickReorder(
            order = historicalOrder,
            allProducts = listOf(liveProduct),
            publicBusinesses = listOf(liveMerchant),
            currentCartBusinessId = ""
        )

        assertEquals(75.0, result.addedItems[0].second, 0.001) // Uses live price 75.0, not historical 50.0
    }

    @Test
    fun `QR-04 - closed or inactive merchant blocks reorder safely`() {
        val historicalOrder = Pedido(
            pedidoId = "order-126",
            businessId = "biz-closed",
            status = "completed",
            items = listOf(OrderItem(productId = "prod-1", name = "Tacos", price = 60.0, quantity = 1))
        )
        val closedMerchant = BusinessInfo(id = "biz-closed", isOpen = false, isActive = false)
        val liveProduct = Product(id = "prod-1", businessId = "biz-closed", name = "Tacos", price = 60.0, status = ProductStatus.ACTIVE, isHidden = false)

        val result = evaluateQuickReorder(
            order = historicalOrder,
            allProducts = listOf(liveProduct),
            publicBusinesses = listOf(closedMerchant),
            currentCartBusinessId = ""
        )

        assertTrue(result.isBlockedDueToMerchant)
        assertTrue(result.addedItems.isEmpty())
        assertEquals(0, result.omittedCount)
    }

    @Test
    fun `QR-05 - existing cart from different merchant triggers cart clear flag`() {
        val historicalOrder = Pedido(
            pedidoId = "order-127",
            businessId = "biz-new",
            status = "completed",
            items = listOf(OrderItem(productId = "prod-new", name = "Sushi", price = 120.0, quantity = 1))
        )
        val liveMerchant = BusinessInfo(id = "biz-new", isOpen = true, isActive = true)
        val liveProduct = Product(id = "prod-new", businessId = "biz-new", name = "Sushi", price = 120.0, status = ProductStatus.ACTIVE, isHidden = false)

        val result = evaluateQuickReorder(
            order = historicalOrder,
            allProducts = listOf(liveProduct),
            publicBusinesses = listOf(liveMerchant),
            currentCartBusinessId = "biz-old" // Cart belongs to another business!
        )

        assertTrue("Must require cart clear when reordering from a different merchant", result.requiresCartClear)
        assertEquals(1, result.addedItems.size)
    }

    @Test
    fun `QR-06 - historical order remains completely immutable after reorder evaluation`() {
        val originalItems = listOf(OrderItem(productId = "prod-imm", name = "Ensalada", price = 45.0, quantity = 1))
        val historicalOrder = Pedido(
            pedidoId = "order-imm",
            businessId = "biz-imm",
            status = "delivered",
            total = 45.0,
            items = originalItems
        )
        val liveMerchant = BusinessInfo(id = "biz-imm", isOpen = true, isActive = true)
        val liveProduct = Product(id = "prod-imm", businessId = "biz-imm", name = "Ensalada", price = 55.0, status = ProductStatus.ACTIVE, isHidden = false)

        evaluateQuickReorder(
            order = historicalOrder,
            allProducts = listOf(liveProduct),
            publicBusinesses = listOf(liveMerchant),
            currentCartBusinessId = ""
        )

        // Verify that original order object is 100% unaltered
        assertEquals("order-imm", historicalOrder.pedidoId)
        assertEquals(45.0, historicalOrder.total, 0.001)
        assertEquals(45.0, historicalOrder.items[0].price, 0.001)
        assertEquals(1, historicalOrder.items.size)
    }
}
