package com.example.domain.model.menu

/**
 * Estado de Disponibilidad de una Variante.
 */
enum class ProductVariantStatus {
    ACTIVE,
    OUT_OF_STOCK,
    INACTIVE
}

/**
 * Entidad de Dominio: ProductVariant (v2.2 Enterprise)
 * Representa una combinación específica e inmutable de Tamaño y Dimensiones para un producto.
 * Posee una clave/SKU determinista (`variantKey`) que la identifica de forma única.
 */
data class ProductVariant(
    val id: String = "",
    val productId: String = "",
    val restaurantId: String = "",
    val size: ProductSize? = null,
    val dimensionValues: Map<String, String> = emptyMap(), // Map de DimensionName -> OptionValue (ej: "Masa" -> "Integral")
    val variantKey: String = "", // SKU / Clave determinista inmutable
    val priceOverride: Double? = null, // Precio fijo específico de la variante si aplica
    val status: ProductVariantStatus = ProductVariantStatus.ACTIVE,
    val stockLimit: Int? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
