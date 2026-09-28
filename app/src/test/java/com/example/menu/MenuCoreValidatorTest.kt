package com.example.menu

import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.validation.menu.MenuCoreValidator
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuCoreValidatorTest {

    @Test
    fun `test validator accepts valid category and product`() {
        val cat = MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Tacos")
        val prod = MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "Taco al Pastor", basePrice = 45.0)

        assertTrue(MenuCoreValidator.validateCategory(cat).isValid)
        assertTrue(MenuCoreValidator.validateProduct(prod).isValid)
    }

    @Test
    fun `test validator rejects invalid product with empty name or negative price`() {
        val invalidProd = MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "", basePrice = -10.0)
        val result = MenuCoreValidator.validateProduct(invalidProd)

        assertFalse(result.isValid)
        assertTrue(result.errors.size >= 2)
    }
}
