package com.example.menu

import com.example.data.dto.menu.ProductSizeDto
import com.example.data.dto.menu.ProductVariantDto
import com.example.data.mapper.menu.VariantMapper
import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.ProductVariant
import com.example.domain.model.menu.ProductVariantStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class VariantMapperTest {

    @Test
    fun `test VariantMapper bidirectional conversion between DTO and Domain`() {
        val size = ProductSize(id = "size_med", name = "Mediana", priceAdjustment = 50.0)
        val domainVariant = ProductVariant(
            id = "var_02",
            productId = "prod_pizza",
            restaurantId = "rest_01",
            size = size,
            dimensionValues = mapOf("Masa" to "Delgada"),
            variantKey = "var_prod_pizza_size_med_masa_delgada",
            priceOverride = null,
            status = ProductVariantStatus.ACTIVE
        )

        val dto = VariantMapper.variantToDto(domainVariant)
        val mappedDomain = VariantMapper.variantToDomain(dto)

        assertEquals(domainVariant.id, mappedDomain.id)
        assertEquals(domainVariant.productId, mappedDomain.productId)
        assertNotNull(mappedDomain.size)
        assertEquals("Mediana", mappedDomain.size?.name)
        assertEquals("Delgada", mappedDomain.dimensionValues["Masa"])
        assertEquals("var_prod_pizza_size_med_masa_delgada", mappedDomain.variantKey)
    }
}
