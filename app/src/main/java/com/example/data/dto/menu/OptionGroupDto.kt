package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: OptionGroupDto (v2.2 Enterprise)
 */
data class OptionGroupDto(
    @get:PropertyName("id") @set:PropertyName("id") var id: String = "",
    @get:PropertyName("restaurantId") @set:PropertyName("restaurantId") var restaurantId: String = "",
    @get:PropertyName("name") @set:PropertyName("name") var name: String = "",
    @get:PropertyName("description") @set:PropertyName("description") var description: String = "",
    @get:PropertyName("minSelection") @set:PropertyName("minSelection") var minSelection: Int = 0,
    @get:PropertyName("maxSelection") @set:PropertyName("maxSelection") var maxSelection: Int = 1,
    @get:PropertyName("isRequired") @set:PropertyName("isRequired") var isRequired: Boolean = false,
    @get:PropertyName("allowFreeOptionsCount") @set:PropertyName("allowFreeOptionsCount") var allowFreeOptionsCount: Int = 0,
    @get:PropertyName("orderIndex") @set:PropertyName("orderIndex") var orderIndex: Int = 0,
    @get:PropertyName("optionIds") @set:PropertyName("optionIds") var optionIds: List<String> = emptyList(),
    @get:PropertyName("options") @set:PropertyName("options") var options: List<OptionDto> = emptyList(),
    @get:PropertyName("createdAt") @set:PropertyName("createdAt") var createdAt: Long = 0L,
    @get:PropertyName("updatedAt") @set:PropertyName("updatedAt") var updatedAt: Long = 0L
)
