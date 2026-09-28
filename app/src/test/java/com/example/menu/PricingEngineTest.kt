package com.example.menu

import com.example.domain.engine.menu.PricingEngineImpl
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.ProductVariant
import org.junit.Assert.assertEquals
import org.junit.Test

class PricingEngineTest {

    private val pricingEngine = PricingEngineImpl()

    @Test
    fun `test calculateItemPrice computes exact breakdown for base product with size adjustment options and tax`() {
        val product = MenuProduct(
            id = "p_pizza",
            name = "Pizza Hawaiana",
            basePrice = 250.0,
            taxPercentage = 15.0 // 15% IVA
        )

        val sizeLarge = ProductSize(id = "s_fam", name = "Familiar", priceAdjustment = 100.0)
        val variant = ProductVariant(
            id = "var_fam",
            productId = "p_pizza",
            size = sizeLarge,
            priceOverride = 350.0
        )

        val groupSalsas = MenuOptionGroup(
            id = "g_salsas",
            name = "Salsas",
            allowFreeOptionsCount = 1
        )
        val opt1 = MenuOption(id = "o1", name = "Salsa Chimichurri", additionalPrice = 20.0, orderIndex = 0) // Gratis
        val opt2 = MenuOption(id = "o2", name = "Extra Queso", additionalPrice = 50.0, orderIndex = 1) // 50.0

        val optionSelections = mapOf(groupSalsas to listOf(opt1, opt2))

        val breakdown = pricingEngine.calculateItemPrice(
            product = product,
            variant = variant,
            optionSelections = optionSelections
        )

        // Subtotal = 350.0 (Override) + 50.0 (Opciones: 0 + 50) = 400.0
        // IVA (15%) = 400.0 * 0.15 = 60.0
        // Total = 460.0
        assertEquals(250.0, breakdown.basePrice, 0.001)
        assertEquals(350.0, breakdown.variantOverridePrice!!, 0.001)
        assertEquals(50.0, breakdown.optionsTotal, 0.001)
        assertEquals(400.0, breakdown.subtotal, 0.001)
        assertEquals(60.0, breakdown.taxAmount, 0.001)
        assertEquals(460.0, breakdown.totalPrice, 0.001)
    }
}
