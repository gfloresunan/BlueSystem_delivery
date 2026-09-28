package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: ProductSizeDto (v2.2 Enterprise)
 */
data class ProductSizeDto(
    @get:PropertyName("id") @set:PropertyName("id") var id: String = "",
    @get:PropertyName("name") @set:PropertyName("name") var name: String = "",
    @get:PropertyName("priceAdjustment") @set:PropertyName("priceAdjustment") var priceAdjustment: Double = 0.0,
    @get:PropertyName("priceMultiplier") @set:PropertyName("priceMultiplier") var priceMultiplier: Double = 1.0,
    @get:PropertyName("orderIndex") @set:PropertyName("orderIndex") var orderIndex: Int = 0
)
