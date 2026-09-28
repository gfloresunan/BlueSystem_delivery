package com.example.menu

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class CanonicalJsonChecksumHelperTest {

    @Test
    fun `test canonical json checksum generation is deterministic`() {
        val categories = listOf(
            MenuCategory(id = "cat_02", restaurantId = "rest_01", primaryName = "Bebidas"),
            MenuCategory(id = "cat_01", restaurantId = "rest_01", primaryName = "Hamburguesas")
        )

        val products = listOf(
            MenuProduct(id = "prod_01", restaurantId = "rest_01", primaryCategoryId = "cat_01", name = "BBQ Burger", basePrice = 250.0)
        )

        val checksum1 = CanonicalJsonChecksumHelper.computeMenuChecksum(categories, products)
        val checksum2 = CanonicalJsonChecksumHelper.computeMenuChecksum(categories.reversed(), products)

        assertEquals("El checksum debe ser idéntico independientemente del orden inicial de la lista", checksum1, checksum2)
    }

    @Test
    fun `test canonical json checksum changes when price changes`() {
        val categories = listOf(MenuCategory(id = "cat_01", restaurantId = "rest_01", primaryName = "Hamburguesas"))
        val products1 = listOf(MenuProduct(id = "prod_01", restaurantId = "rest_01", primaryCategoryId = "cat_01", name = "BBQ Burger", basePrice = 250.0))
        val products2 = listOf(MenuProduct(id = "prod_01", restaurantId = "rest_01", primaryCategoryId = "cat_01", name = "BBQ Burger", basePrice = 280.0))

        val checksum1 = CanonicalJsonChecksumHelper.computeMenuChecksum(categories, products1)
        val checksum2 = CanonicalJsonChecksumHelper.computeMenuChecksum(categories, products2)

        assertNotEquals("El checksum debe cambiar cuando un precio se modifica", checksum1, checksum2)
    }
}
