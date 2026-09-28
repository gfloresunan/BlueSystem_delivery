package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: ComboSlotDto (v2.2 Enterprise)
 */
data class ComboSlotDto(
    @get:PropertyName("slotId") @set:PropertyName("slotId") var slotId: String = "",
    @get:PropertyName("slotName") @set:PropertyName("slotName") var slotName: String = "",
    @get:PropertyName("isRequired") @set:PropertyName("isRequired") var isRequired: Boolean = true,
    @get:PropertyName("allowedProductIds") @set:PropertyName("allowedProductIds") var allowedProductIds: List<String> = emptyList(),
    @get:PropertyName("allowVariantCustomization") @set:PropertyName("allowVariantCustomization") var allowVariantCustomization: Boolean = true,
    @get:PropertyName("allowOptionCustomization") @set:PropertyName("allowOptionCustomization") var allowOptionCustomization: Boolean = true,
    @get:PropertyName("defaultProductId") @set:PropertyName("defaultProductId") var defaultProductId: String? = null,
    @get:PropertyName("orderIndex") @set:PropertyName("orderIndex") var orderIndex: Int = 0
)
