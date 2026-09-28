package com.example.menu

import com.example.domain.engine.menu.PricingEngineImpl
import com.example.domain.engine.menu.VariantKeyGenerator
import com.example.domain.engine.menu.VariantMatrixEngineImpl
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.ProductVariant
import com.example.domain.model.menu.ProductVariantStatus
import com.example.domain.model.menu.VariantDimension
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VariantEngineE2ETest {

    private val matrixEngine = VariantMatrixEngineImpl()
    private val pricingEngine = PricingEngineImpl()

    @Test
    fun `test single item fallback for products without variants`() {
        val simpleProduct = MenuProduct(
            id = "p_drink",
            name = "Gaseosa 350ml",
            basePrice = 45.0,
            taxPercentage = 0.0,
            status = MenuProductStatus.ACTIVE
        )

        // Producto sin variantes (Single Item) -> no pasa variante al PricingEngine
        val breakdown = pricingEngine.calculateItemPrice(simpleProduct, variant = null)

        assertEquals(45.0, breakdown.basePrice, 0.001)
        assertEquals(45.0, breakdown.subtotal, 0.001)
        assertEquals(45.0, breakdown.totalPrice, 0.001)
    }

    @Test
    fun `test multidimensional variant generation deterministic SKU lookup and pricing interaction`() {
        // 1. Definición de dimensiones: 2 tamaños x 2 masas x 2 orillas = 8 variantes
        val sizes = listOf(
            ProductSize(id = "s_med", name = "Mediana", priceAdjustment = 40.0),
            ProductSize(id = "s_fam", name = "Familiar", priceAdjustment = 100.0)
        )

        val dimensions = listOf(
            VariantDimension(id = "dim_masa", name = "Masa", options = listOf("Delgada", "Integral")),
            VariantDimension(id = "dim_orilla", name = "Orilla", options = listOf("Tradicional", "Rellena Queso"))
        )

        val product = MenuProduct(
            id = "pizza_supreme",
            restaurantId = "rest_01",
            name = "Pizza Supreme Gourmet",
            basePrice = 300.0,
            taxPercentage = 0.0
        )

        // 2. Generación matricial de variantes
        val startTime = System.currentTimeMillis()
        val variantMatrix = matrixEngine.generateVariantMatrix(
            productId = product.id,
            restaurantId = product.restaurantId,
            sizes = sizes,
            dimensions = dimensions,
            basePrice = product.basePrice
        )
        val elapsedTime = System.currentTimeMillis() - startTime

        assertEquals(8, variantMatrix.size)
        assertTrue("La generación matricial debe ser ultrarrápida (<10ms)", elapsedTime < 100)

        // 3. Verificación de SKU determinista para una combinación específica
        val expectedSKU = VariantKeyGenerator.generateVariantKey(
            productId = "pizza_supreme",
            size = sizes[1], // Familiar
            dimensionValues = mapOf("Masa" to "Integral", "Orilla" to "Rellena Queso")
        )

        val targetVariant = variantMatrix.find { it.variantKey == expectedSKU }
        assertNotNull("La variante debe encontrarse mediante su SKU determinista", targetVariant)
        assertEquals(400.0, targetVariant?.priceOverride!!, 0.001) // 300 + 100

        // 4. Integración con Opciones del Sprint 13B.2
        val groupExtras = MenuOptionGroup(id = "g_extras", name = "Extras", allowFreeOptionsCount = 0)
        val extraPepperoni = MenuOption(id = "o_pep", name = "Doble Pepperoni", additionalPrice = 45.0)

        val breakdown = pricingEngine.calculateItemPrice(
            product = product,
            variant = targetVariant,
            optionSelections = mapOf(groupExtras to listOf(extraPepperoni))
        )

        // Total = 400.0 (Variante Familiar) + 45.0 (Doble Pepperoni) = 445.0
        assertEquals(445.0, breakdown.subtotal, 0.001)
        assertEquals(445.0, breakdown.totalPrice, 0.001)
    }
}
