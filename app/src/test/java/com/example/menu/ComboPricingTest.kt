package com.example.menu

import com.example.domain.engine.menu.PricingEngineImpl
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.SelectedComboSlot
import org.junit.Assert.assertEquals
import org.junit.Test

class ComboPricingTest {

    private val pricingEngine = PricingEngineImpl()

    @Test
    fun `test calculateComboPrice computes exact breakdown with fixed discount and slot extra prices`() {
        val combo = MenuCombo(
            id = "combo_01",
            name = "Combo Dúo Gourmet",
            basePrice = 400.0,
            fixedDiscount = 50.0 // Descuento de $50
        )

        val slot1 = SelectedComboSlot(slotId = "s1", slotName = "Pizza", selectedProductName = "Pepperoni", slotExtraPrice = 20.0)
        val slot2 = SelectedComboSlot(slotId = "s2", slotName = "Bebida", selectedProductName = "Gaseosa", slotExtraPrice = 0.0)

        // Subtotal = (400.0 base + 20.0 extras) - 50.0 descuento = 370.0
        // IVA (10%) = 37.0
        // Total = 407.0
        val breakdown = pricingEngine.calculateComboPrice(combo, listOf(slot1, slot2), taxPercentage = 10.0)

        assertEquals(400.0, breakdown.basePrice, 0.001)
        assertEquals(20.0, breakdown.optionsTotal, 0.001)
        assertEquals(50.0, breakdown.comboDiscount, 0.001)
        assertEquals(370.0, breakdown.subtotal, 0.001)
        assertEquals(37.0, breakdown.taxAmount, 0.001)
        assertEquals(407.0, breakdown.totalPrice, 0.001)
    }
}
