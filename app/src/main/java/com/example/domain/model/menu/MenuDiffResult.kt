package com.example.domain.model.menu

data class PriceChange(
    val productId: String,
    val productName: String,
    val oldPrice: Double,
    val newPrice: Double
)

data class MenuDiffResult(
    val baseVersion: String,
    val targetVersion: String,
    val addedProducts: List<MenuProduct> = emptyList(),
    val removedProducts: List<MenuProduct> = emptyList(),
    val priceChanges: List<PriceChange> = emptyList(),
    val modifiedProductCount: Int = 0,
    val timestamp: Long = System.currentTimeMillis()
)
