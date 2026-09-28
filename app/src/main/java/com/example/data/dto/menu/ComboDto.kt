package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: ComboDto (v2.2 Enterprise)
 */
data class ComboDto(
    @get:PropertyName("id") @set:PropertyName("id") var id: String = "",
    @get:PropertyName("restaurantId") @set:PropertyName("restaurantId") var restaurantId: String = "",
    @get:PropertyName("name") @set:PropertyName("name") var name: String = "",
    @get:PropertyName("description") @set:PropertyName("description") var description: String = "",
    @get:PropertyName("basePrice") @set:PropertyName("basePrice") var basePrice: Double = 0.0,
    @get:PropertyName("fixedDiscount") @set:PropertyName("fixedDiscount") var fixedDiscount: Double = 0.0,
    @get:PropertyName("percentageDiscount") @set:PropertyName("percentageDiscount") var percentageDiscount: Double = 0.0,
    @get:PropertyName("slots") @set:PropertyName("slots") var slots: List<ComboSlotDto> = emptyList(),
    @get:PropertyName("status") @set:PropertyName("status") var status: String = "ACTIVE",
    @get:PropertyName("orderIndex") @set:PropertyName("orderIndex") var orderIndex: Int = 0,
    @get:PropertyName("createdAt") @set:PropertyName("createdAt") var createdAt: Long = 0L,
    @get:PropertyName("updatedAt") @set:PropertyName("updatedAt") var updatedAt: Long = 0L
)
