package com.example.menu

import com.example.domain.engine.menu.OptionValidationEngineImpl
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OptionValidationEngineTest {

    private val validator = OptionValidationEngineImpl()

    @Test
    fun `test validateOptionGroup catches invalid min max selections`() {
        val invalidGroup = MenuOptionGroup(
            id = "grp_01",
            name = "Salsas",
            minSelection = 3,
            maxSelection = 1, // min > max
            isRequired = true
        )

        val result = validator.validateOptionGroup(invalidGroup)

        assertFalse(result.isValid)
        assertTrue(result.errors.any { it.contains("minSelection") })
    }

    @Test
    fun `test validateProductOptionGroupLink detects missing and duplicate group IDs`() {
        val availableGroup = MenuOptionGroup(id = "grp_01", name = "Salsas")

        val productWithMissingGroup = MenuProduct(
            id = "p1",
            name = "Tacos",
            optionGroupIds = listOf("grp_01", "grp_missing", "grp_01") // grupo inexistente y duplicado
        )

        val result = validator.validateProductOptionGroupLink(
            product = productWithMissingGroup,
            availableGroups = listOf(availableGroup)
        )

        assertFalse(result.isValid)
        assertEquals(2, result.errors.size)
        assertTrue(result.errors.any { it.contains("duplicados") })
        assertTrue(result.errors.any { it.contains("inexistente") })
    }
}
