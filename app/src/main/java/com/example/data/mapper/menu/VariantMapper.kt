package com.example.data.mapper.menu

import com.example.data.dto.menu.ProductSizeDto
import com.example.data.dto.menu.ProductVariantDto
import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.ProductVariant
import com.example.domain.model.menu.ProductVariantStatus

/**
 * Mapper Bivalente: VariantMapper (v2.2 Enterprise)
 */
object VariantMapper {

    fun sizeToDomain(dto: ProductSizeDto): ProductSize {
        return ProductSize(
            id = dto.id,
            name = dto.name,
            priceAdjustment = dto.priceAdjustment,
            priceMultiplier = dto.priceMultiplier,
            orderIndex = dto.orderIndex
        )
    }

    fun sizeToDto(domain: ProductSize): ProductSizeDto {
        return ProductSizeDto(
            id = domain.id,
            name = domain.name,
            priceAdjustment = domain.priceAdjustment,
            priceMultiplier = domain.priceMultiplier,
            orderIndex = domain.orderIndex
        )
    }

    fun variantToDomain(dto: ProductVariantDto): ProductVariant {
        val statusEnum = try {
            ProductVariantStatus.valueOf(dto.status)
        } catch (e: Exception) {
            ProductVariantStatus.ACTIVE
        }

        return ProductVariant(
            id = dto.id,
            productId = dto.productId,
            restaurantId = dto.restaurantId,
            size = dto.size?.let { sizeToDomain(it) },
            dimensionValues = dto.dimensionValues,
            variantKey = dto.variantKey,
            priceOverride = dto.priceOverride,
            status = statusEnum,
            stockLimit = dto.stockLimit,
            createdAt = dto.createdAt,
            updatedAt = dto.updatedAt
        )
    }

    fun variantToDto(domain: ProductVariant): ProductVariantDto {
        return ProductVariantDto(
            id = domain.id,
            productId = domain.productId,
            restaurantId = domain.restaurantId,
            size = domain.size?.let { sizeToDto(it) },
            dimensionValues = domain.dimensionValues,
            variantKey = domain.variantKey,
            priceOverride = domain.priceOverride,
            status = domain.status.name,
            stockLimit = domain.stockLimit,
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
