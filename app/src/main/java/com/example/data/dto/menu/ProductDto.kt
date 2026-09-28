package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

@IgnoreExtraProperties
data class ProductDto(
    var id: String = "",
    var businessId: String = "",
    var restaurantId: String = "",
    var categoryId: String = "",
    var primaryCategoryId: String = "",
    var globalCategoryId: String? = null,
    var secondaryCollectionTags: List<String> = emptyList(),
    var name: String = "",
    var description: String = "",
    var price: Double = 0.0,
    var basePrice: Double = 0.0,
    var taxPercentage: Double = 15.0,
    var imageUrl: String = "",
    var thumbnailUrl: String = "",
    var storagePath: String = "",
    var mimeType: String = "image/webp",
    var width: Int = 0,
    var height: Int = 0,
    var sizeBytes: Long = 0L,
    var imageVariants: Map<String, String> = emptyMap(),
    var galleryImages: List<String> = emptyList(),
    var productType: String = "SINGLE_ITEM",
    var status: String = "ACTIVE",
    @get:PropertyName("active")
    @set:PropertyName("active")
    var active: Boolean = true,
    @get:PropertyName("isAvailable")
    @set:PropertyName("isAvailable")
    @set:JvmName("setIsAvailableField")
    var isAvailable: Boolean = true,
    @get:PropertyName("available")
    @set:PropertyName("available")
    @set:JvmName("setAvailableField")
    var available: Boolean = true,
    var preparationTimeMinutes: Int = 15,
    @get:PropertyName("isPopular")
    @set:PropertyName("isPopular")
    var isPopular: Boolean = false,
    @get:PropertyName("isVegetarian")
    @set:PropertyName("isVegetarian")
    var isVegetarian: Boolean = false,
    @get:PropertyName("isSpicy")
    @set:PropertyName("isSpicy")
    var isSpicy: Boolean = false,
    @get:PropertyName("isGlutenFree")
    @set:PropertyName("isGlutenFree")
    var isGlutenFree: Boolean = false,
    var variantIds: List<String> = emptyList(),
    var optionGroupIds: List<String> = emptyList(),
    var availabilityScheduleId: String? = null,
    var orderIndex: Int = 0,
    var versionNumber: Long = 1L,
    var branchAvailability: Map<String, Map<String, Any>> = emptyMap(),
    var createdAt: Long = 0L,
    var updatedAt: Long = 0L
) {
    fun getEffectiveBusinessId(): String = businessId.ifBlank { restaurantId }
    fun getEffectivePrice(): Double = if (price > 0.0) price else basePrice
    fun getEffectiveCategoryId(): String = categoryId.ifBlank { primaryCategoryId }
    fun getEffectiveIsActive(): Boolean = active && isAvailable && available

    fun isAvailableInBranch(branchId: String): Boolean {
        if (!getEffectiveIsActive()) return false
        if (branchId.isBlank() || branchAvailability.isEmpty()) return true
        val branchMap = branchAvailability[branchId] ?: return true
        val avail = branchMap["isAvailable"] as? Boolean
        return avail ?: true
    }
}

fun com.google.firebase.firestore.DocumentSnapshot.toProductDtoSafely(): ProductDto {
    return try {
        this.toObject(ProductDto::class.java)?.copy(id = this.id) ?: parseProductDtoManual(this)
    } catch (e: Exception) {
        android.util.Log.w("ProductDtoParser", "Resilient parsing for product ${this.id}: ${e.message}")
        parseProductDtoManual(this)
    }
}

fun parseProductDtoManual(doc: com.google.firebase.firestore.DocumentSnapshot): ProductDto {
    val busId = doc.getString("businessId") ?: doc.getString("restaurantId") ?: doc.getString("comercioId") ?: ""
    val restId = doc.getString("restaurantId") ?: doc.getString("businessId") ?: doc.getString("comercioId") ?: ""
    val catId = doc.getString("categoryId") ?: doc.getString("primaryCategoryId") ?: doc.getString("categoria") ?: ""
    val primCatId = doc.getString("primaryCategoryId") ?: doc.getString("categoryId") ?: doc.getString("categoria") ?: ""
    val globalCatId = doc.getString("globalCategoryId")
    val name = doc.getString("name") ?: doc.getString("nombre") ?: doc.getString("title") ?: "Producto"
    val desc = doc.getString("description") ?: doc.getString("descripcion") ?: ""
    
    val priceVal = getDoubleValueFromDoc(doc, "price", "basePrice", "precio") ?: 0.0
    val basePriceVal = getDoubleValueFromDoc(doc, "basePrice", "price", "precio") ?: 0.0
    val taxVal = getDoubleValueFromDoc(doc, "taxPercentage", "impuesto") ?: 15.0
    
    val imgUrl = doc.getString("imageUrl") ?: doc.getString("imagenUrl") ?: doc.getString("photoUrl") ?: ""
    val thumbUrl = doc.getString("thumbnailUrl") ?: doc.getString("miniaturaUrl") ?: ""
    val mime = doc.getString("mimeType") ?: "image/webp"
    
    val prodType = doc.getString("productType") ?: "SINGLE_ITEM"
    val statusVal = doc.getString("status") ?: "ACTIVE"
    
    val isActive = getBoolValueFromDoc(doc, "active", "isActive", "available") ?: true
    val isAvail = getBoolValueFromDoc(doc, "isAvailable", "available") ?: true
    val avail = getBoolValueFromDoc(doc, "available", "isAvailable") ?: true
    
    val prepTime = (doc.get("preparationTimeMinutes") as? Number)?.toInt() ?: 15
    val isPop = getBoolValueFromDoc(doc, "isPopular", "popular") ?: false
    val isVeg = getBoolValueFromDoc(doc, "isVegetarian", "vegetariano") ?: false
    val isSpicyVal = getBoolValueFromDoc(doc, "isSpicy", "picante") ?: false
    val isGluten = getBoolValueFromDoc(doc, "isGlutenFree", "sinGluten") ?: false
    
    val orderIdx = (doc.get("orderIndex") as? Number)?.toInt() ?: 0

    val createdLong = getLongValueFromDoc(doc, "createdAt")
    val updatedLong = getLongValueFromDoc(doc, "updatedAt")
    val imgVariantsAny = doc.get("imageVariants")
    val imgVariants = if (imgVariantsAny is Map<*, *>) {
        imgVariantsAny.entries.associate { it.key.toString() to (it.value?.toString() ?: "") }
    } else emptyMap()

    val galleryAny = doc.get("galleryImages") ?: doc.get("images") ?: doc.get("imagenes")
    val gallery = if (galleryAny is List<*>) galleryAny.mapNotNull { it?.toString() } else emptyList()

    return ProductDto(
        id = doc.id,
        businessId = busId,
        restaurantId = restId,
        categoryId = catId,
        primaryCategoryId = primCatId,
        globalCategoryId = globalCatId,
        name = name,
        description = desc,
        price = priceVal,
        basePrice = basePriceVal,
        taxPercentage = taxVal,
        imageUrl = imgUrl,
        thumbnailUrl = thumbUrl,
        imageVariants = imgVariants,
        galleryImages = gallery,
        mimeType = mime,
        productType = prodType,
        status = statusVal,
        active = isActive,
        isAvailable = isAvail,
        available = avail,
        preparationTimeMinutes = prepTime,
        isPopular = isPop,
        isVegetarian = isVeg,
        isSpicy = isSpicyVal,
        isGlutenFree = isGluten,
        orderIndex = orderIdx,
        createdAt = createdLong,
        updatedAt = updatedLong
    )
}

private fun getDoubleValueFromDoc(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fields: String): Double? {
    for (f in fields) {
        val valAny = doc.get(f) ?: continue
        when (valAny) {
            is Number -> return valAny.toDouble()
            is String -> valAny.toDoubleOrNull()?.let { return it }
        }
    }
    return null
}

private fun getLongValueFromDoc(doc: com.google.firebase.firestore.DocumentSnapshot, field: String): Long {
    val valAny = doc.get(field) ?: return 0L
    return when (valAny) {
        is Number -> valAny.toLong()
        is com.google.firebase.Timestamp -> valAny.seconds * 1000L
        is String -> valAny.toLongOrNull() ?: 0L
        else -> 0L
    }
}

private fun getBoolValueFromDoc(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fields: String): Boolean? {
    for (f in fields) {
        val valAny = doc.get(f) ?: continue
        when (valAny) {
            is Boolean -> return valAny
            is String -> return valAny.lowercase() == "true" || valAny == "1"
            is Number -> return valAny.toInt() == 1
        }
    }
    return null
}
