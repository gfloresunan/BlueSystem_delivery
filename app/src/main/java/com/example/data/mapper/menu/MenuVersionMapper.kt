package com.example.data.mapper.menu

import com.example.data.dto.menu.MenuVersionDto
import com.example.domain.model.menu.MenuVersion
import com.example.domain.model.menu.MenuVersionStatus

object MenuVersionMapper {

    fun toDomain(dto: MenuVersionDto): MenuVersion {
        val status = try {
            MenuVersionStatus.valueOf(dto.status)
        } catch (e: Exception) {
            MenuVersionStatus.BUILDING
        }

        return MenuVersion(
            id = dto.id,
            restaurantId = dto.restaurantId,
            version = dto.version,
            checksum = dto.checksum,
            generatedAt = if (dto.generatedAt > 0L) dto.generatedAt else System.currentTimeMillis(),
            publishedAt = dto.publishedAt,
            generatedBy = dto.generatedBy,
            schemaVersion = dto.schemaVersion,
            menuHash = dto.menuHash,
            status = status
        )
    }

    fun toDto(domain: MenuVersion): MenuVersionDto {
        return MenuVersionDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            version = domain.version,
            checksum = domain.checksum,
            generatedAt = domain.generatedAt,
            publishedAt = domain.publishedAt,
            generatedBy = domain.generatedBy,
            schemaVersion = domain.schemaVersion,
            menuHash = domain.menuHash,
            status = domain.status.name
        )
    }
}
