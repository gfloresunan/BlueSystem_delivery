package com.example.domain.model.menu

/**
 * Entidad de Dominio: MenuProduct (Producto Base v2.2)
 * Representa un artículo comercial en el Restaurant Menu Engine con soporte para
 * variantes, modificadores, impuestos, etiquetas secundarias y versionado.
 */
data class MenuProduct(
    val id: String = "",
    val restaurantId: String = "",
    val primaryCategoryId: String = "",
    val globalCategoryId: String? = null,
    val secondaryCollectionTags: List<String> = emptyList(),
    val name: String = "",
    val description: String = "",
    val basePrice: Double = 0.0,
    val taxPercentage: Double = 15.0,
    val imageUrl: String = "",
    val galleryImages: List<String> = emptyList(),
    val productType: MenuProductType = MenuProductType.SINGLE_ITEM,
    val status: MenuProductStatus = MenuProductStatus.ACTIVE,
    val preparationTimeMinutes: Int = 15,
    val isPopular: Boolean = false,
    val isVegetarian: Boolean = false,
    val isSpicy: Boolean = false,
    val isGlutenFree: Boolean = false,
    val variantIds: List<String> = emptyList(),
    val optionGroupIds: List<String> = emptyList(),
    val availabilityScheduleId: String? = null,
    val orderIndex: Int = 0,
    val versionNumber: Long = 1L,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    val formattedPrice: String
        get() = "C$ ${basePrice.toInt()}"

    fun getMainImage(): String {
        return imageUrl.ifBlank { galleryImages.firstOrNull() ?: "" }
    }
}
