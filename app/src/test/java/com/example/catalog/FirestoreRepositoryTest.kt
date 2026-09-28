package com.example.catalog

import com.example.domain.model.Product
import org.junit.Assert.*
import org.junit.Test

class FirestoreRepositoryTest {

    @Test
    fun testProductMappingForFirestorePersistence() {
        val prod = Product(
            id = "p_999",
            name = "Combo Enterprise",
            price = 450.0,
            categoryName = "Combos"
        )

        assertEquals("p_999", prod.id)
        assertEquals("Combo Enterprise", prod.name)
        assertEquals(450.0, prod.price, 0.001)
    }
}
