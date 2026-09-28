package com.example.catalog

import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import org.junit.Assert.*
import org.junit.Test

class VariantPersistenceTest {

    @Test
    fun testOptionGroupDataStructureIntegrity() {
        val option = MenuOption(id = "opt_1", name = "Queso Extra", additionalPrice = 25.0)
        val group = MenuOptionGroup(
            id = "og_1",
            name = "Extras",
            isRequired = false,
            options = listOf(option)
        )

        assertEquals("og_1", group.id)
        assertEquals(1, group.options.size)
        assertEquals(25.0, group.options.first().additionalPrice, 0.001)
    }
}
