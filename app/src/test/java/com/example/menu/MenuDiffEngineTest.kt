package com.example.menu

import com.example.domain.engine.menu.MenuDiffEngineImpl
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import org.junit.Assert.assertEquals
import org.junit.Test

class MenuDiffEngineTest {

    private val diffEngine = MenuDiffEngineImpl()

    @Test
    fun `calculateDiff detects added products removed products and price changes correctly`() {
        val prod1 = MenuProduct(id = "p1", name = "Pizza", basePrice = 200.0)
        val prod2Old = MenuProduct(id = "p2", name = "Soda", basePrice = 30.0)
        val prod2New = MenuProduct(id = "p2", name = "Soda", basePrice = 35.0)
        val prod3 = MenuProduct(id = "p3", name = "Helado", basePrice = 50.0)

        val baseSnapshot = MenuSnapshot(
            semanticVersion = "v2.2.0",
            products = listOf(prod1, prod2Old)
        )

        val targetSnapshot = MenuSnapshot(
            semanticVersion = "v2.3.0",
            products = listOf(prod2New, prod3) // prod1 eliminada, prod2 precio cambiado (+5.0), prod3 añadida
        )

        val diff = diffEngine.calculateDiff(baseSnapshot, targetSnapshot)

        assertEquals("v2.2.0", diff.baseVersion)
        assertEquals("v2.3.0", diff.targetVersion)
        assertEquals(1, diff.addedProducts.size)
        assertEquals("p3", diff.addedProducts[0].id)
        assertEquals(1, diff.removedProducts.size)
        assertEquals("p1", diff.removedProducts[0].id)
        assertEquals(1, diff.priceChanges.size)
        assertEquals("p2", diff.priceChanges[0].productId)
        assertEquals(30.0, diff.priceChanges[0].oldPrice, 0.001)
        assertEquals(35.0, diff.priceChanges[0].newPrice, 0.001)
        assertEquals(3, diff.modifiedProductCount)
    }
}
