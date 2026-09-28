package com.example.catalog

import com.example.domain.model.ProductStatus
import org.junit.Assert.*
import org.junit.Test

class OfflineSyncTest {

    @Test
    fun testOfflineProductStatusEnumMapping() {
        val active = ProductStatus.valueOf("ACTIVE")
        val outOfStock = ProductStatus.valueOf("OUT_OF_STOCK")

        assertEquals(ProductStatus.ACTIVE, active)
        assertEquals(ProductStatus.OUT_OF_STOCK, outOfStock)
    }
}
