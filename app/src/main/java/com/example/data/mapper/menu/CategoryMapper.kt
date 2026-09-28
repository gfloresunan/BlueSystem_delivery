package com.example.data.mapper.menu

import com.example.data.dto.menu.CategoryDto
import com.example.domain.model.menu.MenuCategory

object CategoryMapper {

    fun toDomain(dto: CategoryDto): MenuCategory {
        return MenuCategory(
            id = dto.id,
            restaurantId = dto.restaurantId,
            primaryName = dto.primaryName,
            description = dto.description,
            imageUrl = dto.imageUrl,
            orderIndex = dto.orderIndex,
            isActive = dto.isActive,
            availabilityScheduleId = dto.availabilityScheduleId,
            versionNumber = dto.versionNumber,
            createdAt = if (dto.createdAt > 0L) dto.createdAt else System.currentTimeMillis(),
            updatedAt = if (dto.updatedAt > 0L) dto.updatedAt else System.currentTimeMillis()
        )
    }

    fun toDto(domain: MenuCategory): CategoryDto {
        return CategoryDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            primaryName = domain.primaryName,
            description = domain.description,
            imageUrl = domain.imageUrl,
            orderIndex = domain.orderIndex,
            isActive = domain.isActive,
            availabilityScheduleId = domain.availabilityScheduleId,
            versionNumber = domain.versionNumber,
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
