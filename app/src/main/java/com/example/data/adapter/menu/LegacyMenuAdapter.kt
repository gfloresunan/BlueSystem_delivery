package com.example.data.adapter.menu

import com.example.domain.model.Category as LegacyCategory
import com.example.domain.model.Product as LegacyProduct
import com.example.domain.model.ProductCategory as LegacyProductCategory
import com.example.domain.model.ProductStatus as LegacyProductStatus
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuProductType

/**
 * Adaptador de Coexistencia (Adapter Pattern - Rule 5 Governance)
 * Convierte entre los modelos legados (com.example.domain.model.Product / Category)
 * y los nuevos modelos Enterprise v2.2 del Restaurant Menu Engine (MenuProduct / MenuCategory).
 *
 * Estrategia de Degradación Graceful (Sprint 13B.1D):
 * - ARCHIVED -> Mapeado transparentemente a INACTIVE.
 * - COMBO / VARIABLE_ITEM -> Mapeado a LegacyProductCategory.COMBO con prefijo indicativo en categoryName.
 * - Variantes no implementadas -> Manejadas de forma segura sin excepciones NPE.
 */
object LegacyMenuAdapter {

    fun toLegacyProduct(v2Product: MenuProduct, categoryName: String = ""): LegacyProduct {
        val legacyStatus = when (v2Product.status) {
            MenuProductStatus.ACTIVE -> LegacyProductStatus.ACTIVE
            MenuProductStatus.OUT_OF_STOCK -> LegacyProductStatus.OUT_OF_STOCK
            MenuProductStatus.INACTIVE, MenuProductStatus.ARCHIVED -> LegacyProductStatus.INACTIVE
        }

        val legacyCategoryEnum = when (v2Product.productType) {
            MenuProductType.COMBO -> LegacyProductCategory.COMBO
            MenuProductType.VARIABLE_ITEM -> LegacyProductCategory.SPECIAL
            MenuProductType.SINGLE_ITEM -> LegacyProductCategory.MAIN_COURSE
        }

        val prefix = when (v2Product.productType) {
            MenuProductType.COMBO -> "[Combo] "
            MenuProductType.VARIABLE_ITEM -> "[Variable] "
            MenuProductType.SINGLE_ITEM -> ""
        }

        val baseCategoryName = categoryName.ifBlank { "General" }
        val effectiveCategoryName = if (prefix.isNotBlank() && !baseCategoryName.startsWith(prefix.trim())) {
            "$prefix$baseCategoryName"
        } else {
            baseCategoryName
        }

        val safeImageUrl = v2Product.imageUrl.ifBlank { v2Product.galleryImages.firstOrNull() ?: "" }

        return LegacyProduct(
            id = v2Product.id,
            businessId = v2Product.restaurantId,
            name = v2Product.name,
            description = v2Product.description,
            price = v2Product.basePrice,
            taxPercentage = v2Product.taxPercentage,
            category = legacyCategoryEnum,
            categoryName = effectiveCategoryName,
            status = legacyStatus,
            imageUrl = safeImageUrl,
            images = v2Product.galleryImages,
            preparationTimeMinutes = v2Product.preparationTimeMinutes,
            isPopular = v2Product.isPopular,
            isVegetarian = v2Product.isVegetarian,
            isSpicy = v2Product.isSpicy,
            order = v2Product.orderIndex
        )
    }

    fun toV2Product(legacyProduct: LegacyProduct, primaryCategoryId: String = ""): MenuProduct {
        val v2Status = when (legacyProduct.status) {
            LegacyProductStatus.ACTIVE -> MenuProductStatus.ACTIVE
            LegacyProductStatus.OUT_OF_STOCK -> MenuProductStatus.OUT_OF_STOCK
            LegacyProductStatus.INACTIVE -> MenuProductStatus.INACTIVE
            else -> MenuProductStatus.ACTIVE
        }

        val v2Type = when (legacyProduct.category) {
            LegacyProductCategory.COMBO -> MenuProductType.COMBO
            else -> MenuProductType.SINGLE_ITEM
        }

        return MenuProduct(
            id = legacyProduct.id,
            restaurantId = legacyProduct.businessId,
            primaryCategoryId = primaryCategoryId,
            secondaryCollectionTags = if (legacyProduct.categoryName.isNotBlank()) listOf(legacyProduct.categoryName) else emptyList(),
            name = legacyProduct.name,
            description = legacyProduct.description,
            basePrice = legacyProduct.price,
            taxPercentage = legacyProduct.taxPercentage,
            imageUrl = legacyProduct.imageUrl,
            galleryImages = legacyProduct.images,
            productType = v2Type,
            status = v2Status,
            preparationTimeMinutes = legacyProduct.preparationTimeMinutes,
            isPopular = legacyProduct.isPopular,
            isVegetarian = legacyProduct.isVegetarian,
            isSpicy = legacyProduct.isSpicy,
            orderIndex = legacyProduct.order
        )
    }

    fun toLegacyCategory(v2Category: MenuCategory): LegacyCategory {
        return LegacyCategory(
            id = v2Category.id,
            name = v2Category.primaryName,
            iconUrl = v2Category.imageUrl,
            active = v2Category.isActive,
            orderIndex = v2Category.orderIndex
        )
    }

    fun toV2Category(legacyCategory: LegacyCategory, restaurantId: String = ""): MenuCategory {
        return MenuCategory(
            id = legacyCategory.id,
            restaurantId = restaurantId,
            primaryName = legacyCategory.name,
            imageUrl = legacyCategory.iconUrl,
            isActive = legacyCategory.active,
            orderIndex = legacyCategory.orderIndex
        )
    }
}
