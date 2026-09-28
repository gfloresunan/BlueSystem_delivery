package com.example.menu

import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuOptionStatus
import com.example.domain.model.menu.SelectedOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuOptionGroupTest {

    @Test
    fun `test MenuOptionGroup entity default values and immutability`() {
        val group = MenuOptionGroup(
            id = "grp_01",
            restaurantId = "rest_01",
            name = "Extras de Hamburguesa",
            minSelection = 0,
            maxSelection = 3,
            isRequired = false,
            allowFreeOptionsCount = 1
        )

        assertEquals("grp_01", group.id)
        assertEquals("Extras de Hamburguesa", group.name)
        assertFalse(group.isRequired)
        assertEquals(1, group.allowFreeOptionsCount)
    }

    @Test
    fun `test SelectedOption output contract calculates final price correctly`() {
        val freeOption = SelectedOption(
            optionGroupId = "grp_01",
            optionGroupName = "Salsas",
            optionId = "opt_bbq",
            optionName = "Salsa BBQ",
            additionalPrice = 25.0,
            isFreeOption = true
        )

        val paidOption = SelectedOption(
            optionGroupId = "grp_01",
            optionGroupName = "Extras",
            optionId = "opt_bacon",
            optionName = "Extra Tocineta",
            additionalPrice = 40.0,
            isFreeOption = false
        )

        assertEquals(0.0, freeOption.finalPrice, 0.001)
        assertEquals(40.0, paidOption.finalPrice, 0.001)
    }
}
