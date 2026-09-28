package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: OptionDto (v2.2 Enterprise)
 */
data class OptionDto(
    @get:PropertyName("id") @set:PropertyName("id") var id: String = "",
    @get:PropertyName("groupId") @set:PropertyName("groupId") var groupId: String = "",
    @get:PropertyName("restaurantId") @set:PropertyName("restaurantId") var restaurantId: String = "",
    @get:PropertyName("name") @set:PropertyName("name") var name: String = "",
    @get:PropertyName("additionalPrice") @set:PropertyName("additionalPrice") var additionalPrice: Double = 0.0,
    @get:PropertyName("isDefault") @set:PropertyName("isDefault") var isDefault: Boolean = false,
    @get:PropertyName("status") @set:PropertyName("status") var status: String = "ACTIVE",
    @get:PropertyName("orderIndex") @set:PropertyName("orderIndex") var orderIndex: Int = 0,
    @get:PropertyName("createdAt") @set:PropertyName("createdAt") var createdAt: Long = 0L,
    @get:PropertyName("updatedAt") @set:PropertyName("updatedAt") var updatedAt: Long = 0L
)
