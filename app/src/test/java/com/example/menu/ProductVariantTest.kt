package com.example.menu

import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.ProductVariant
import com.example.domain.model.menu.ProductVariantStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class ProductVariantTest {

    @Test
    fun `test ProductVariant entity initialization and properties`() {
        val size = ProductSize(id = "size_large", name = "Familiar", priceAdjustment = 150.0)
        val variant = ProductVariant(
            id = "var_01",
            productId = "prod_pizza",
            restaurantId = "rest_01",
            size = size,
            dimensionValues = mapOf("Masa" to "Integral", "Orilla" to "Rellena de Queso"),
            variantKey = "var_prod_pizza_size_large_masa_integral_orilla_rellena",
            priceOverride = 450.0,
            status = ProductVariantStatus.ACTIVE
        )

        assertEquals("var_01", variant.id)
        assertEquals("prod_pizza", variant.productId)
        assertNotNull(variant.size)
        assertEquals("Familiar", variant.size?.name)
        assertEquals(2, variant.dimensionValues.size)
        assertEquals("Integral", variant.dimensionValues["Masa"])
        assertEquals("var_prod_pizza_size_large_masa_integral_orilla_rellena", variant.variantKey)
        assertEquals(450.0, variant.priceOverride!!, 0.001)
    }
}
