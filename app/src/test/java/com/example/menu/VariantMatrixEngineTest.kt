package com.example.menu

import com.example.domain.engine.menu.VariantMatrixEngineImpl
import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.VariantDimension
import org.junit.Assert.assertEquals
import org.junit.Test

class VariantMatrixEngineTest {

    private val matrixEngine = VariantMatrixEngineImpl()

    @Test
    fun `test generateVariantMatrix computes exact Cartesian product count`() {
        val sizes = listOf(
            ProductSize(id = "s_med", name = "Mediana", priceAdjustment = 50.0),
            ProductSize(id = "s_fam", name = "Familiar", priceAdjustment = 120.0)
        )

        val dimensions = listOf(
            VariantDimension(id = "dim_masa", name = "Masa", options = listOf("Tradicional", "Integral")),
            VariantDimension(id = "dim_orilla", name = "Orilla", options = listOf("Normal", "Queso"))
        )

        // 2 tamaños x 2 masas x 2 orillas = 8 variantes combinatorias
        val variants = matrixEngine.generateVariantMatrix(
            productId = "pizza_pepperoni",
            restaurantId = "rest_01",
            sizes = sizes,
            dimensions = dimensions,
            basePrice = 200.0
        )

        assertEquals(8, variants.size)
        assertEquals(250.0, variants.find { it.size?.id == "s_med" }?.priceOverride!!, 0.001) // 200 + 50
        assertEquals(320.0, variants.find { it.size?.id == "s_fam" }?.priceOverride!!, 0.001) // 200 + 120
    }
}
