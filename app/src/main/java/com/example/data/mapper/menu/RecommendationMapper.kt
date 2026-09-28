package com.example.data.mapper.menu

import com.example.data.dto.menu.RecommendationDto
import com.example.domain.model.menu.ProductRecommendation

object RecommendationMapper {

    fun toDomain(dto: RecommendationDto): ProductRecommendation {
        return ProductRecommendation(
            id = dto.id,
            restaurantId = dto.restaurantId,
            sourceProductId = dto.sourceProductId,
            recommendedProductId = dto.recommendedProductId,
            score = dto.score,
            reason = dto.reason
        )
    }

    fun toDto(domain: ProductRecommendation): RecommendationDto {
        return RecommendationDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            sourceProductId = domain.sourceProductId,
            recommendedProductId = domain.recommendedProductId,
            score = domain.score,
            reason = domain.reason
        )
    }
}
