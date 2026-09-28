package com.example.menu

import com.example.domain.engine.menu.ComboDAGValidationEngineImpl
import com.example.domain.model.menu.ComboItemSlot
import com.example.domain.model.menu.MenuCombo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ComboDAGValidationEngineTest {

    private val validator = ComboDAGValidationEngineImpl()

    @Test
    fun `test validateComboDAG detects circular references infinite loop in combo tree`() {
        // Combo A contiene Combo B en su slot
        val comboA = MenuCombo(
            id = "combo_A",
            name = "Combo A",
            slots = listOf(ComboItemSlot(slotId = "s1", allowedProductIds = listOf("combo_B")))
        )

        // Combo B contiene Combo A en su slot (Ciclo A -> B -> A)
        val comboB = MenuCombo(
            id = "combo_B",
            name = "Combo B",
            slots = listOf(ComboItemSlot(slotId = "s2", allowedProductIds = listOf("combo_A")))
        )

        val result = validator.validateComboDAG(listOf(comboA, comboB))

        assertFalse("Debe detectar el ciclo DAG y rechazar la configuración", result.isValid)
        assertTrue(result.errors.any { it.contains("referencia circular") || it.contains("Ciclo DAG") })
    }

    @Test
    fun `test validateComboDAG passes for clean acyclic combo hierarchy`() {
        val comboA = MenuCombo(
            id = "combo_A",
            name = "Combo Pareja",
            slots = listOf(ComboItemSlot(slotId = "s1", allowedProductIds = listOf("p_burg", "p_pizza")))
        )

        val result = validator.validateComboDAG(listOf(comboA))

        assertTrue("La jerarquía acíclica debe ser válida", result.isValid)
    }
}
