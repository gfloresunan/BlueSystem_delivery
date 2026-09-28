package com.example.data.mapper.menu

import com.example.data.dto.menu.ComboDto
import com.example.data.dto.menu.ComboSlotDto
import com.example.domain.model.menu.ComboItemSlot
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuComboStatus

/**
 * Mapper Bivalente: ComboMapper (v2.2 Enterprise)
 */
object ComboMapper {

    fun slotToDomain(dto: ComboSlotDto): ComboItemSlot {
        return ComboItemSlot(
            slotId = dto.slotId,
            slotName = dto.slotName,
            isRequired = dto.isRequired,
            allowedProductIds = dto.allowedProductIds,
            allowVariantCustomization = dto.allowVariantCustomization,
            allowOptionCustomization = dto.allowOptionCustomization,
            defaultProductId = dto.defaultProductId,
            orderIndex = dto.orderIndex
        )
    }

    fun slotToDto(domain: ComboItemSlot): ComboSlotDto {
        return ComboSlotDto(
            slotId = domain.slotId,
            slotName = domain.slotName,
            isRequired = domain.isRequired,
            allowedProductIds = domain.allowedProductIds,
            allowVariantCustomization = domain.allowVariantCustomization,
            allowOptionCustomization = domain.allowOptionCustomization,
            defaultProductId = domain.defaultProductId,
            orderIndex = domain.orderIndex
        )
    }

    fun comboToDomain(dto: ComboDto): MenuCombo {
        val statusEnum = try {
            MenuComboStatus.valueOf(dto.status)
        } catch (e: Exception) {
            MenuComboStatus.ACTIVE
        }

        return MenuCombo(
            id = dto.id,
            restaurantId = dto.restaurantId,
            name = dto.name,
            description = dto.description,
            basePrice = dto.basePrice,
            fixedDiscount = dto.fixedDiscount,
            percentageDiscount = dto.percentageDiscount,
            slots = dto.slots.map { slotToDomain(it) },
            status = statusEnum,
            orderIndex = dto.orderIndex,
            createdAt = dto.createdAt,
            updatedAt = dto.updatedAt
        )
    }

    fun comboToDto(domain: MenuCombo): ComboDto {
        return ComboDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            name = domain.name,
            description = domain.description,
            basePrice = domain.basePrice,
            fixedDiscount = domain.fixedDiscount,
            percentageDiscount = domain.percentageDiscount,
            slots = domain.slots.map { slotToDto(it) },
            status = domain.status.name,
            orderIndex = domain.orderIndex,
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
