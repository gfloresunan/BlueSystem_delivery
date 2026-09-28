package com.example.data.mapper.menu

import com.example.data.dto.menu.MenuSnapshotDto
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.menu.MenuSnapshotStatus

object MenuSnapshotMapper {

    fun toDomain(dto: MenuSnapshotDto): MenuSnapshot {
        val status = try {
            MenuSnapshotStatus.valueOf(dto.status)
        } catch (e: Exception) {
            MenuSnapshotStatus.PUBLISHED
        }

        return MenuSnapshot(
            id = dto.id,
            restaurantId = dto.restaurantId,
            branchId = dto.branchId,
            semanticVersion = dto.semanticVersion,
            publishedAt = dto.publishedAt,
            publisherUserId = dto.publisherUserId,
            changeReason = dto.changeReason,
            status = status,
            sha256Checksum = dto.sha256Checksum,
            schemaVersion = dto.schemaVersion,
            categories = dto.categories.map { CategoryMapper.toDomain(it) },
            products = dto.products.map { ProductMapper.toDomain(it) },
            variants = dto.variants.map { VariantMapper.variantToDomain(it) },
            options = dto.options.map { OptionGroupMapper.toDomain(it) },
            combos = dto.combos.map { ComboMapper.comboToDomain(it) },
            promotions = dto.promotions.map { PromotionMapper.toDomain(it) },
            schedules = dto.schedules.map { AvailabilityMapper.scheduleToDomain(it) }
        )
    }

    fun toDto(domain: MenuSnapshot): MenuSnapshotDto {
        return MenuSnapshotDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            branchId = domain.branchId,
            semanticVersion = domain.semanticVersion,
            publishedAt = domain.publishedAt,
            publisherUserId = domain.publisherUserId,
            changeReason = domain.changeReason,
            status = domain.status.name,
            sha256Checksum = domain.sha256Checksum,
            schemaVersion = domain.schemaVersion,
            categories = domain.categories.map { CategoryMapper.toDto(it) },
            products = domain.products.map { ProductMapper.toDto(it) },
            variants = domain.variants.map { VariantMapper.variantToDto(it) },
            options = domain.options.map { OptionGroupMapper.toDto(it) },
            combos = domain.combos.map { ComboMapper.comboToDto(it) },
            promotions = domain.promotions.map { PromotionMapper.toDto(it) },
            schedules = domain.schedules.map { AvailabilityMapper.scheduleToDto(it) }
        )
    }
}
