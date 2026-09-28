package com.example.menu

import com.example.data.dto.menu.ComboDto
import com.example.data.dto.menu.ComboSlotDto
import com.example.data.mapper.menu.ComboMapper
import com.example.domain.model.menu.ComboItemSlot
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuComboStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ComboMapperTest {

    @Test
    fun `test ComboMapper bidirectional conversion between DTO and Domain`() {
        val slot = ComboItemSlot(
            slotId = "slot_01",
            slotName = "Entrada",
            allowedProductIds = listOf("p_tequeños", "p_empanadas")
        )

        val domainCombo = MenuCombo(
            id = "combo_01",
            restaurantId = "rest_01",
            name = "Super Combo",
            basePrice = 300.0,
            fixedDiscount = 50.0,
            slots = listOf(slot),
            status = MenuComboStatus.ACTIVE
        )

        val dto = ComboMapper.comboToDto(domainCombo)
        val mappedDomain = ComboMapper.comboToDomain(dto)

        assertEquals(domainCombo.id, mappedDomain.id)
        assertEquals(domainCombo.name, mappedDomain.name)
        assertEquals(50.0, mappedDomain.fixedDiscount, 0.001)
        assertEquals(1, mappedDomain.slots.size)
        assertEquals("Entrada", mappedDomain.slots.first().slotName)
    }
}
