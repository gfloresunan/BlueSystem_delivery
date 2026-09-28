package com.example.menu

import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuProductType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuProductTest {

    @Test
    fun `test menu product creation and formatted price`() {
        val product = MenuProduct(
            id = "prod_01",
            restaurantId = "rest_01",
            primaryCategoryId = "cat_01",
            name = "Hamburguesa BBQ",
            basePrice = 250.0,
            productType = MenuProductType.SINGLE_ITEM,
            status = MenuProductStatus.ACTIVE,
            galleryImages = listOf("https://storage.com/img1.jpg")
        )

        assertEquals("prod_01", product.id)
        assertEquals("Hamburguesa BBQ", product.name)
        assertEquals(250.0, product.basePrice, 0.001)
        assertEquals("C$ 250", product.formattedPrice)
        assertEquals("https://storage.com/img1.jpg", product.getMainImage())
        assertTrue(product.status == MenuProductStatus.ACTIVE)
    }
}
