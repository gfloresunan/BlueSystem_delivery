package com.example.menu

import com.example.domain.engine.menu.OptionPricingCalculator
import com.example.domain.engine.menu.OptionValidationEngineImpl
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.SelectedOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OptionEngineE2ETest {

    private val optionValidator = OptionValidationEngineImpl()

    @Test
    fun `test end to end product option selection validation pricing and cart contract generation`() {
        // 1. Configuración de Grupos de Opciones y Opciones por el Merchant
        val groupSalsas = MenuOptionGroup(
            id = "grp_salsas",
            restaurantId = "rest_01",
            name = "Elige tus Salsas",
            minSelection = 1,
            maxSelection = 3,
            isRequired = true,
            allowFreeOptionsCount = 1, // 1 salsa gratis, el resto se cobra
            options = listOf(
                MenuOption(id = "o1", groupId = "grp_salsas", name = "Salsa Chipotle", additionalPrice = 10.0, orderIndex = 0),
                MenuOption(id = "o2", groupId = "grp_salsas", name = "Guacamole Extra", additionalPrice = 25.0, orderIndex = 1)
            )
        )

        val product = MenuProduct(
            id = "prod_tacos",
            restaurantId = "rest_01",
            name = "Orden de Tacos Al Pastor (3 unidades)",
            basePrice = 180.0,
            status = MenuProductStatus.ACTIVE,
            optionGroupIds = listOf("grp_salsas")
        )

        // 2. Validación de Vinculación N:M
        val linkValidation = optionValidator.validateProductOptionGroupLink(product, listOf(groupSalsas))
        assertTrue("La vinculación N:M debe ser válida", linkValidation.isValid)

        // 3. Simulación de Selección del Cliente: Selecciona Salsa Chipotle (orderIndex 0) y Guacamole (orderIndex 1)
        val selectedOptionsFromUser = listOf(groupSalsas.options[0], groupSalsas.options[1])

        // 4. Cálculo de Precios y Generación de Contrato Inmutable SelectedOption
        val selectedOptionContracts: List<SelectedOption> = OptionPricingCalculator.calculateSelectedOptions(
            group = groupSalsas,
            selectedOptions = selectedOptionsFromUser
        )

        assertEquals(2, selectedOptionContracts.size)

        // Salsa Chipotle (orderIndex 0) es Gratis
        val chipotle = selectedOptionContracts.find { it.optionId == "o1" }!!
        assertTrue(chipotle.isFreeOption)
        assertEquals(0.0, chipotle.finalPrice, 0.001)

        // Guacamole Extra (orderIndex 1) es Pagada
        val guacamole = selectedOptionContracts.find { it.optionId == "o2" }!!
        assertEquals(25.0, guacamole.finalPrice, 0.001)

        // 5. Cálculo del Precio Total del Producto para el Carrito
        val totalItemPrice = product.basePrice + selectedOptionContracts.sumOf { it.finalPrice }
        assertEquals(205.0, totalItemPrice, 0.001) // 180.0 + 0.0 + 25.0 = 205.0
    }
}
