package com.example.menu

import com.example.domain.engine.menu.ValidationEngineImpl
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ValidationEngineTest {

    private val validator = ValidationEngineImpl()

    @Test
    fun `test publishing validation fails if categories or products are empty`() {
        val emptyCategoriesResult = validator.validateMenuForPublishing(emptyList(), emptyList())
        assertFalse(emptyCategoriesResult.isValid)
        assertTrue(emptyCategoriesResult.errors.any { it.contains("categoría activa") })
    }

    @Test
    fun `test publishing validation succeeds for valid menu structure`() {
        val cat = MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Hamburguesas")
        val prod = MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "BBQ Burger", basePrice = 250.0)

        val result = validator.validateMenuForPublishing(listOf(cat), listOf(prod))
        assertTrue(result.isValid)
        assertTrue(result.errors.isEmpty())
    }

    @Test
    fun `test publishing validation fails if product points to non-existent category`() {
        val cat = MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Hamburguesas")
        val prod = MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "non_existent_category", name = "BBQ Burger", basePrice = 250.0)

        val result = validator.validateMenuForPublishing(listOf(cat), listOf(prod))
        assertFalse(result.isValid)
        assertTrue(result.errors.any { it.contains("asociado a una categoría inexistente") })
    }
}
