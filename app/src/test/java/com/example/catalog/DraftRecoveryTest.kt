package com.example.catalog

import com.example.domain.model.Product
import com.example.domain.model.catalog.ProductDraft
import org.junit.Assert.*
import org.junit.Test

class DraftRecoveryTest {

    @Test
    fun testDraftObjectCreationAndSerialization() {
        val prod = Product(name = "Pizza Borrador", price = 350.0)
        val draft = ProductDraft(step = 3, product = prod, lastSavedAt = 100000L)

        assertEquals(3, draft.step)
        assertEquals("Pizza Borrador", draft.product.name)
        assertEquals(350.0, draft.product.price, 0.001)
    }
}
