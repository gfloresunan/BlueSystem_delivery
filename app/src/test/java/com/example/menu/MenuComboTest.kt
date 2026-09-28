package com.example.menu

import com.example.domain.model.menu.ComboItemSlot
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuComboStatus
import com.example.domain.model.menu.SelectedComboSlot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuComboTest {

    @Test
    fun `test MenuCombo initialization and slot composition`() {
        val slotMain = ComboItemSlot(
            slotId = "slot_main",
            slotName = "Plato Principal",
            allowedProductIds = listOf("p_burg1", "p_burg2")
        )
        val slotDrink = ComboItemSlot(
            slotId = "slot_drink",
            slotName = "Bebida",
            allowedProductIds = listOf("p_coca", "p_fanta")
        )

        val combo = MenuCombo(
            id = "combo_fam_01",
            restaurantId = "rest_01",
            name = "Combo Pareja",
            basePrice = 450.0,
            slots = listOf(slotMain, slotDrink),
            status = MenuComboStatus.ACTIVE
        )

        assertEquals("combo_fam_01", combo.id)
        assertEquals(2, combo.slots.size)
        assertEquals("Plato Principal", combo.slots.first().slotName)
    }

    @Test
    fun `test SelectedComboSlot output contract`() {
        val selectedSlot = SelectedComboSlot(
            slotId = "slot_drink",
            slotName = "Bebida",
            selectedProductId = "p_coca",
            selectedProductName = "Coca-Cola Zero 500ml",
            selectedVariantKey = "var_p_coca_500ml",
            slotExtraPrice = 15.0
        )

        assertEquals("slot_drink", selectedSlot.slotId)
        assertEquals("Coca-Cola Zero 500ml", selectedSlot.selectedProductName)
        assertEquals(15.0, selectedSlot.slotExtraPrice, 0.001)
    }
}
