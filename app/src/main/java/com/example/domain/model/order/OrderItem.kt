package com.example.domain.model.order

import com.example.domain.engine.kds.KitchenStation

/**
 * Item individual dentro de un pedido con ruteo a estación de cocina.
 */
data class OrderItem(
    val id: String = "",
    val productId: String = "",
    val productName: String = "",
    val quantity: Int = 1,
    val unitPrice: Double = 0.0,
    val totalPrice: Double = 0.0,
    val selectedVariantId: String? = null,
    val selectedOptions: List<String> = emptyList(),
    val targetStation: KitchenStation = KitchenStation.GRILL,
    val isItemReady: Boolean = false,
    val notes: String = ""
)
