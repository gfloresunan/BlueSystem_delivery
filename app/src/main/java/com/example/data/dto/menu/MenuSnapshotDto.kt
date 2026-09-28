package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class MenuSnapshotDto(
    var id: String = "",
    var restaurantId: String = "",
    var branchId: String = "",
    var semanticVersion: String = "v2.3.0",
    var publishedAt: Long = 0L,
    var publisherUserId: String = "",
    var changeReason: String = "",
    var status: String = "PUBLISHED",
    var sha256Checksum: String = "",
    var schemaVersion: String = "v2.2",
    var categories: List<CategoryDto> = emptyList(),
    var products: List<ProductDto> = emptyList(),
    var variants: List<ProductVariantDto> = emptyList(),
    var options: List<OptionGroupDto> = emptyList(),
    var combos: List<ComboDto> = emptyList(),
    var promotions: List<PromotionDto> = emptyList(),
    var schedules: List<AvailabilityScheduleDto> = emptyList()
)
