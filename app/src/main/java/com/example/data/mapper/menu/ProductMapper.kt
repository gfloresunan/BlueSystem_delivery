package com.example.data.mapper.menu

import com.example.data.dto.menu.ProductDto
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuProductType

object ProductMapper {

    fun toDomain(dto: ProductDto): MenuProduct {
        val type = try {
            MenuProductType.valueOf(dto.productType)
        } catch (e: Exception) {
            MenuProductType.SINGLE_ITEM
        }

        val status = try {
            MenuProductStatus.valueOf(dto.status)
        } catch (e: Exception) {
            MenuProductStatus.ACTIVE
        }

        return MenuProduct(
            id = dto.id,
            restaurantId = dto.getEffectiveBusinessId(),
            primaryCategoryId = dto.getEffectiveCategoryId(),
            globalCategoryId = dto.globalCategoryId,
            secondaryCollectionTags = dto.secondaryCollectionTags,
            name = dto.name,
            description = dto.description,
            basePrice = dto.getEffectivePrice(),
            taxPercentage = dto.taxPercentage,
            imageUrl = dto.imageUrl,
            galleryImages = dto.galleryImages,
            productType = type,
            status = if (dto.getEffectiveIsActive()) status else MenuProductStatus.OUT_OF_STOCK,
            preparationTimeMinutes = dto.preparationTimeMinutes,
            isPopular = dto.isPopular,
            isVegetarian = dto.isVegetarian,
            isSpicy = dto.isSpicy,
            isGlutenFree = dto.isGlutenFree,
            variantIds = dto.variantIds,
            optionGroupIds = dto.optionGroupIds,
            orderIndex = dto.orderIndex,
            versionNumber = dto.versionNumber,
            createdAt = if (dto.createdAt > 0L) dto.createdAt else System.currentTimeMillis(),
            updatedAt = if (dto.updatedAt > 0L) dto.updatedAt else System.currentTimeMillis()
        )
    }

    fun toDto(domain: MenuProduct): ProductDto {
        return ProductDto(
            id = domain.id,
            businessId = domain.restaurantId,
            restaurantId = domain.restaurantId,
            categoryId = domain.primaryCategoryId,
            primaryCategoryId = domain.primaryCategoryId,
            globalCategoryId = domain.globalCategoryId,
            secondaryCollectionTags = domain.secondaryCollectionTags,
            name = domain.name,
            description = domain.description,
            basePrice = domain.basePrice,
            taxPercentage = domain.taxPercentage,
            imageUrl = domain.imageUrl,
            galleryImages = domain.galleryImages,
            productType = domain.productType.name,
            status = domain.status.name,
            preparationTimeMinutes = domain.preparationTimeMinutes,
            isPopular = domain.isPopular,
            isVegetarian = domain.isVegetarian,
            isSpicy = domain.isSpicy,
            isGlutenFree = domain.isGlutenFree,
            variantIds = domain.variantIds,
            optionGroupIds = domain.optionGroupIds,
            orderIndex = domain.orderIndex,
            versionNumber = domain.versionNumber,
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
