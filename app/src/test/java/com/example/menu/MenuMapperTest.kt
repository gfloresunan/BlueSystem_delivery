package com.example.menu

import com.example.data.dto.menu.CategoryDto
import com.example.data.dto.menu.ProductDto
import com.example.data.mapper.menu.CategoryMapper
import com.example.data.mapper.menu.ProductMapper
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class MenuMapperTest {

    @Test
    fun `test category mapper bidirectional conversion`() {
        val domain = MenuCategory(
            id = "cat_01",
            restaurantId = "rest_01",
            primaryName = "Hamburguesas",
            orderIndex = 2
        )

        val dto = CategoryMapper.toDto(domain)
        assertEquals("cat_01", dto.id)
        assertEquals("Hamburguesas", dto.primaryName)

        val mappedBack = CategoryMapper.toDomain(dto)
        assertEquals(domain.id, mappedBack.id)
        assertEquals(domain.primaryName, mappedBack.primaryName)
        assertEquals(domain.orderIndex, mappedBack.orderIndex)
    }

    @Test
    fun `test product mapper bidirectional conversion`() {
        val domain = MenuProduct(
            id = "prod_01",
            restaurantId = "rest_01",
            primaryCategoryId = "cat_01",
            name = "Pizza XL",
            basePrice = 450.0,
            status = MenuProductStatus.OUT_OF_STOCK
        )

        val dto = ProductMapper.toDto(domain)
        assertEquals("prod_01", dto.id)
        assertEquals("OUT_OF_STOCK", dto.status)

        val mappedBack = ProductMapper.toDomain(dto)
        assertEquals(domain.id, mappedBack.id)
        assertEquals(domain.status, mappedBack.status)
        assertEquals(domain.basePrice, mappedBack.basePrice, 0.001)
    }
}
