package com.example.menu

import com.example.domain.event.menu.MenuDomainEvent
import com.example.domain.event.menu.ProductAvailabilityChanged
import com.example.domain.event.menu.StockDepleted
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DomainEventsTest {

    @Test
    fun `test MenuDomainEvents instantiation and immutability`() {
        val event1: MenuDomainEvent = ProductAvailabilityChanged(
            productId = "p_burg1",
            restaurantId = "rest_01",
            branchId = "branch_centro",
            isAvailable = false,
            reason = "Sin pan de hamburguesa (StockDepleted)"
        )

        val event2: MenuDomainEvent = StockDepleted(
            productId = "p_burg1",
            variantKey = "var_fam",
            restaurantId = "rest_01"
        )

        assertNotNull(event1.eventId)
        assertTrue(event1.timestamp > 0)
        assertTrue(event1 is ProductAvailabilityChanged)
        assertEquals("p_burg1", (event1 as ProductAvailabilityChanged).productId)

        assertTrue(event2 is StockDepleted)
        assertEquals("var_fam", (event2 as StockDepleted).variantKey)
    }
}
