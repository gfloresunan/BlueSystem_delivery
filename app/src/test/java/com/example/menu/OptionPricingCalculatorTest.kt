package com.example.menu

import com.example.domain.engine.menu.OptionPricingCalculator
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OptionPricingCalculatorTest {

    @Test
    fun `test allowFreeOptionsCount 2 assigns free options deterministically by orderIndex ascending`() {
        val group = MenuOptionGroup(
            id = "grp_salsas",
            name = "Salsas",
            allowFreeOptionsCount = 2
        )

        // El cliente seleccionó 3 opciones con orderIndex 0, 1, 2
        val opt1 = MenuOption(id = "o1", name = "Guacamole", additionalPrice = 25.0, orderIndex = 0)
        val opt2 = MenuOption(id = "o2", name = "Salsa Verde", additionalPrice = 15.0, orderIndex = 1)
        val opt3 = MenuOption(id = "o3", name = "Salsa Macha Premium", additionalPrice = 30.0, orderIndex = 2)

        // Pasadas en orden desordenado para probar determinismo
        val userSelectionsInClickOrder = listOf(opt3, opt1, opt2)

        val result = OptionPricingCalculator.calculateSelectedOptions(group, userSelectionsInClickOrder)

        assertEquals(3, result.size)

        // Las primeras 2 por orderIndex (Guacamole orderIndex=0 y Salsa Verde orderIndex=1) deben ser GRATUITAS
        val guacamole = result.find { it.optionId == "o1" }!!
        val salsaVerde = result.find { it.optionId == "o2" }!!
        val salsaMacha = result.find { it.optionId == "o3" }!!

        assertTrue("Guacamole (orderIndex 0) debe ser gratuito", guacamole.isFreeOption)
        assertEquals(0.0, guacamole.finalPrice, 0.001)

        assertTrue("Salsa Verde (orderIndex 1) debe ser gratuita", salsaVerde.isFreeOption)
        assertEquals(0.0, salsaVerde.finalPrice, 0.001)

        assertFalse("Salsa Macha (orderIndex 2, supera límite 2) debe cobrarse", salsaMacha.isFreeOption)
        assertEquals(30.0, salsaMacha.finalPrice, 0.001)
    }
}
