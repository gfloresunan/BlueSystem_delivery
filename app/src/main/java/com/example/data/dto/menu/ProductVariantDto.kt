package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: ProductVariantDto (v2.2 Enterprise)
 */
data class ProductVariantDto(
    @get:PropertyName("id") @set:PropertyName("id") var id: String = "",
    @get:PropertyName("productId") @set:PropertyName("productId") var productId: String = "",
    @get:PropertyName("restaurantId") @set:PropertyName("restaurantId") var restaurantId: String = "",
    @get:PropertyName("size") @set:PropertyName("size") var size: ProductSizeDto? = null,
    @get:PropertyName("dimensionValues") @set:PropertyName("dimensionValues") var dimensionValues: Map<String, String> = emptyMap(),
    @get:PropertyName("variantKey") @set:PropertyName("variantKey") var variantKey: String = "",
    @get:PropertyName("priceOverride") @set:PropertyName("priceOverride") var priceOverride: Double? = null,
    @get:PropertyName("status") @set:PropertyName("status") var status: String = "ACTIVE",
    @get:PropertyName("stockLimit") @set:PropertyName("stockLimit") var stockLimit: Int? = null,
    @get:PropertyName("createdAt") @set:PropertyName("createdAt") var createdAt: Long = 0L,
    @get:PropertyName("updatedAt") @set:PropertyName("updatedAt") var updatedAt: Long = 0L
)
