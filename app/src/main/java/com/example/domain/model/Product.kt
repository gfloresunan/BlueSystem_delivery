package com.example.domain.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

import com.example.domain.model.menu.MenuOptionGroup

enum class ProductStatus {
    ACTIVE,
    INACTIVE,
    OUT_OF_STOCK,
    UNKNOWN;

    companion object {
        fun fromString(value: String?, defaultStatus: ProductStatus = ACTIVE): ProductStatus {
            if (value.isNullOrBlank()) return defaultStatus
            return entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: defaultStatus
        }
    }
}

enum class ProductCategory {
    MAIN_COURSE,
    APPETIZER,
    DESSERT,
    BEVERAGE,
    COMBO,
    SPECIAL,
    GENERAL,
    UNKNOWN;

    companion object {
        fun fromString(value: String?, defaultCat: ProductCategory = GENERAL): ProductCategory {
            if (value.isNullOrBlank()) return defaultCat
            return entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: defaultCat
        }
    }
}

@IgnoreExtraProperties
data class Product(
    val id: String = "",
    val businessId: String = "",
    val branchId: String = "",
    val branchAvailability: Map<String, Map<String, Any>> = emptyMap(),
    val name: String = "",
    val description: String = "",
    val shortDescription: String = "",
    val longDescription: String = "",
    val categoryId: String = "",
    val subCategoryId: String = "",
    val subCategoryName: String = "",
    val price: Double = 0.0,
    val originalPrice: Double? = null,
    val estimatedCost: Double? = null,
    val taxPercentage: Double = 0.0,
    @get:com.google.firebase.firestore.Exclude
    val category: ProductCategory = ProductCategory.MAIN_COURSE,
    val categoryName: String = "", // Categoría dinámica personalizada
    val status: ProductStatus = ProductStatus.ACTIVE,
    val imageUrl: String = "",
    val thumbnailUrl: String = "",
    val storagePath: String = "",
    val mimeType: String = "image/webp",
    val width: Int = 0,
    val height: Int = 0,
    val sizeBytes: Long = 0L,
    val sha256Hash: String = "", // Integridad y deduplicación por SHA-256 (ADR-006)
    val versionNumber: Int = 1,  // Control de versiones de imagen (v1, v2, v3)
    val imageVariants: Map<String, String> = emptyMap(), // Mapa multi-resolución: "100", "300", "600", "1200"
    val images: List<String> = emptyList(), // Galería multi-foto estilo Instagram (solo URLs HTTPS)
    val preparationTimeMinutes: Int = 15,
    @get:PropertyName("isPopular")
    val isPopular: Boolean = false,
    @get:PropertyName("isVegetarian")
    val isVegetarian: Boolean = false,
    @get:PropertyName("isSpicy")
    val isSpicy: Boolean = false,
    @get:PropertyName("isHidden")
    val isHidden: Boolean = false,
    @get:PropertyName("isNew")
    val isNew: Boolean = false,
    @get:PropertyName("isTopSeller")
    val isTopSeller: Boolean = false,
    @get:PropertyName("isRecommended")
    val isRecommended: Boolean = false,
    val spicyLevel: Int = 0, // 0: No picante, 1: Suave, 2: Medio, 3: Picante
    val cuisineType: String = "",
    val tags: List<String> = emptyList(),
    val optionGroups: List<MenuOptionGroup> = emptyList(), // Paso 4: Grupos de opciones y extras
    val allergens: List<String> = emptyList(),
    val calories: Int? = null,
    val stockQuantity: Int? = null,
    val minStockAlert: Int? = 5,
    val autoHideOnZeroStock: Boolean = true,
    val availabilityDays: List<Int> = listOf(1, 2, 3, 4, 5, 6, 7), // Días activos (1: Lunes .. 7: Domingo)
    val order: Int = 0,
    // Métricas por producto
    val salesCount: Int = 0,
    val favoritesCount: Int = 0,
    val rating: Double = 5.0,
    val totalRevenue: Double = 0.0,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
) {
    val hasDiscount: Boolean
        get() = originalPrice != null && originalPrice > price

    val discountPercentage: Int
        get() = if (hasDiscount) {
            (((originalPrice!! - price) / originalPrice) * 100).toInt()
        } else 0

    val formattedPrice: String
        get() = "C$ ${price.toInt()}"

    val formattedOriginalPrice: String?
        get() = originalPrice?.let { "C$ ${it.toInt()}" }

    fun isValidRemoteImageUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val trimmed = url.trim()
        if (trimmed.startsWith("file://") ||
            trimmed.startsWith("/data/user/") ||
            trimmed.startsWith("/data/data/") ||
            trimmed.startsWith("/storage/emulated/") ||
            trimmed.startsWith("content://")) {
            return false
        }
        return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")
    }

    fun getMainImage(): String {
        if (isValidRemoteImageUrl(imageUrl)) return imageUrl
        if (isValidRemoteImageUrl(thumbnailUrl)) return thumbnailUrl
        val firstImg = images.firstOrNull { isValidRemoteImageUrl(it) }
        if (!firstImg.isNullOrBlank()) return firstImg
        return ""
    }

    /**
     * Retorna la URL de la imagen en la resolución idónea según el ancho objetivo del contenedor (px).
     */
    fun getUrlForWidth(targetWidthPx: Int): String {
        if (imageVariants.isNotEmpty()) {
            when {
                targetWidthPx <= 150 -> imageVariants["100"]?.let { if (isValidRemoteImageUrl(it)) return it }
                targetWidthPx <= 400 -> imageVariants["300"]?.let { if (isValidRemoteImageUrl(it)) return it }
                targetWidthPx <= 800 -> imageVariants["600"]?.let { if (isValidRemoteImageUrl(it)) return it }
                else -> imageVariants["1200"]?.let { if (isValidRemoteImageUrl(it)) return it }
            }
        }
        return if (targetWidthPx <= 350 && isValidRemoteImageUrl(thumbnailUrl)) thumbnailUrl else getMainImage()
    }

    fun isAvailableInBranch(targetBranchId: String): Boolean {
        if (targetBranchId.isBlank()) return true
        if (branchId.isNotBlank() && branchId == targetBranchId) return true
        if (branchAvailability.isNotEmpty()) {
            val bMap = branchAvailability[targetBranchId] ?: return true
            val avail = bMap["isAvailable"] as? Boolean
            return avail ?: true
        }
        return true
    }
}
