package com.example.menu

import com.example.data.dto.menu.OptionDto
import com.example.data.dto.menu.OptionGroupDto
import com.example.data.mapper.menu.OptionGroupMapper
import com.example.data.mapper.menu.OptionMapper
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuOptionStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OptionMapperTest {

    @Test
    fun `test OptionMapper bidirectional mapping between DTO and Domain`() {
        val domainOption = MenuOption(
            id = "opt_01",
            groupId = "grp_01",
            restaurantId = "rest_01",
            name = "Extra Queso",
            additionalPrice = 30.0,
            isDefault = true,
            status = MenuOptionStatus.ACTIVE,
            orderIndex = 1
        )

        val dto = OptionMapper.toDto(domainOption)
        val mappedDomain = OptionMapper.toDomain(dto)

        assertEquals(domainOption.id, mappedDomain.id)
        assertEquals(domainOption.name, mappedDomain.name)
        assertEquals(domainOption.additionalPrice, mappedDomain.additionalPrice, 0.001)
        assertTrue(mappedDomain.isDefault)
        assertEquals(MenuOptionStatus.ACTIVE, mappedDomain.status)
    }

    @Test
    fun `test OptionGroupMapper bidirectional mapping with nested options`() {
        val groupDomain = MenuOptionGroup(
            id = "grp_01",
            restaurantId = "rest_01",
            name = "Guarniciones",
            minSelection = 1,
            maxSelection = 2,
            isRequired = true,
            allowFreeOptionsCount = 1,
            options = listOf(
                MenuOption(id = "opt_papas", groupId = "grp_01", name = "Papas Fritas", additionalPrice = 0.0)
            )
        )

        val dto = OptionGroupMapper.toDto(groupDomain)
        val mappedDomain = OptionGroupMapper.toDomain(dto)

        assertEquals(groupDomain.id, mappedDomain.id)
        assertEquals(groupDomain.name, mappedDomain.name)
        assertTrue(mappedDomain.isRequired)
        assertEquals(1, mappedDomain.options.size)
        assertEquals("Papas Fritas", mappedDomain.options.first().name)
    }
}
