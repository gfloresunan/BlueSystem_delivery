package com.example.data.mapper.menu

import com.example.data.dto.menu.OptionDto
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionStatus

/**
 * Mapper Bivalente: OptionMapper (v2.2 Enterprise)
 */
object OptionMapper {

    fun toDomain(dto: OptionDto): MenuOption {
        val statusEnum = try {
            MenuOptionStatus.valueOf(dto.status)
        } catch (e: Exception) {
            MenuOptionStatus.ACTIVE
        }

        return MenuOption(
            id = dto.id,
            groupId = dto.groupId,
            restaurantId = dto.restaurantId,
            name = dto.name,
            additionalPrice = dto.additionalPrice,
            isDefault = dto.isDefault,
            status = statusEnum,
            orderIndex = dto.orderIndex,
            createdAt = dto.createdAt,
            updatedAt = dto.updatedAt
        )
    }

    fun toDto(domain: MenuOption): OptionDto {
        return OptionDto(
            id = domain.id,
            groupId = domain.groupId,
            restaurantId = domain.restaurantId,
            name = domain.name,
            additionalPrice = domain.additionalPrice,
            isDefault = domain.isDefault,
            status = domain.status.name,
            orderIndex = domain.orderIndex,
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
