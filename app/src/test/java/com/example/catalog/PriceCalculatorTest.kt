package com.example.catalog

import com.example.domain.model.Product
import org.junit.Assert.*
import org.junit.Test

class PriceCalculatorTest {

    @Test
    fun testDiscountPercentageCalculation() {
        val prod = Product(price = 80.0, originalPrice = 100.0)
        assertTrue(prod.hasDiscount)
        assertEquals(20, prod.discountPercentage)
    }

    @Test
    fun testNoDiscountWhenOriginalPriceIsNull() {
        val prod = Product(price = 100.0, originalPrice = null)
        assertFalse(prod.hasDiscount)
        assertEquals(0, prod.discountPercentage)
    }
}
