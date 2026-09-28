package com.example.data.mapper.menu

import com.example.data.dto.menu.OptionGroupDto
import com.example.domain.model.menu.MenuOptionGroup

/**
 * Mapper Bivalente: OptionGroupMapper (v2.2 Enterprise)
 */
object OptionGroupMapper {

    fun toDomain(dto: OptionGroupDto): MenuOptionGroup {
        return MenuOptionGroup(
            id = dto.id,
            restaurantId = dto.restaurantId,
            name = dto.name,
            description = dto.description,
            minSelection = dto.minSelection,
            maxSelection = dto.maxSelection,
            isRequired = dto.isRequired,
            allowFreeOptionsCount = dto.allowFreeOptionsCount,
            orderIndex = dto.orderIndex,
            optionIds = dto.optionIds,
            options = dto.options.map { OptionMapper.toDomain(it) },
            createdAt = dto.createdAt,
            updatedAt = dto.updatedAt
        )
    }

    fun toDto(domain: MenuOptionGroup): OptionGroupDto {
        return OptionGroupDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            name = domain.name,
            description = domain.description,
            minSelection = domain.minSelection,
            maxSelection = domain.maxSelection,
            isRequired = domain.isRequired,
            allowFreeOptionsCount = domain.allowFreeOptionsCount,
            orderIndex = domain.orderIndex,
            optionIds = domain.optionIds,
            options = domain.options.map { OptionMapper.toDto(it) },
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
