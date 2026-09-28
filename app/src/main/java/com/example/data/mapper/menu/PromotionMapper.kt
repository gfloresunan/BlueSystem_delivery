package com.example.data.mapper.menu

import com.example.data.dto.menu.PromotionDto
import com.example.data.dto.menu.PromotionRuleDto
import com.example.domain.model.menu.DiscountType
import com.example.domain.model.menu.MenuPromotion
import com.example.domain.model.menu.PromotionRule

object PromotionMapper {

    fun toDomain(dto: PromotionDto): MenuPromotion {
        val discountType = try {
            DiscountType.valueOf(dto.discountType)
        } catch (e: Exception) {
            DiscountType.PERCENTAGE
        }

        val rule = PromotionRule(
            minOrderAmount = dto.rule.minOrderAmount,
            applicableCategoryIds = dto.rule.applicableCategoryIds,
            applicableProductIds = dto.rule.applicableProductIds,
            buyQuantity = dto.rule.buyQuantity,
            getQuantity = dto.rule.getQuantity,
            couponCode = dto.rule.couponCode
        )

        return MenuPromotion(
            id = dto.id,
            restaurantId = dto.restaurantId,
            name = dto.name,
            description = dto.description,
            discountType = discountType,
            discountValue = dto.discountValue,
            rule = rule,
            startDate = dto.startDate,
            endDate = dto.endDate,
            isActive = dto.isActive,
            priority = dto.priority
        )
    }

    fun toDto(domain: MenuPromotion): PromotionDto {
        val ruleDto = PromotionRuleDto(
            minOrderAmount = domain.rule.minOrderAmount,
            applicableCategoryIds = domain.rule.applicableCategoryIds,
            applicableProductIds = domain.rule.applicableProductIds,
            buyQuantity = domain.rule.buyQuantity,
            getQuantity = domain.rule.getQuantity,
            couponCode = domain.rule.couponCode
        )

        return PromotionDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            name = domain.name,
            description = domain.description,
            discountType = domain.discountType.name,
            discountValue = domain.discountValue,
            rule = ruleDto,
            startDate = domain.startDate,
            endDate = domain.endDate,
            isActive = domain.isActive,
            priority = domain.priority
        )
    }
}
