package com.example.menu

import com.example.domain.model.menu.MenuCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuCategoryTest {

    @Test
    fun `test menu category creation with default values`() {
        val category = MenuCategory(
            id = "cat_01",
            restaurantId = "rest_01",
            primaryName = "Hamburguesas"
        )

        assertEquals("cat_01", category.id)
        assertEquals("rest_01", category.restaurantId)
        assertEquals("Hamburguesas", category.primaryName)
        assertTrue(category.isActive)
        assertEquals(1L, category.versionNumber)
    }
}
