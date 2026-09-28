package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

@IgnoreExtraProperties
data class CategoryDto(
    var id: String = "",
    var restaurantId: String = "",
    var primaryName: String = "",
    var description: String = "",
    var imageUrl: String = "",
    var orderIndex: Int = 0,
    @get:PropertyName("isActive")
    @set:PropertyName("isActive")
    var isActive: Boolean = true,
    var availabilityScheduleId: String? = null,
    var versionNumber: Long = 1L,
    var createdAt: Long = 0L,
    var updatedAt: Long = 0L
)

fun com.google.firebase.firestore.DocumentSnapshot.toCategoryDtoSafely(): CategoryDto {
    return try {
        this.toObject(CategoryDto::class.java)?.copy(id = this.id) ?: parseCategoryDtoManual(this)
    } catch (e: Exception) {
        android.util.Log.w("CategoryDtoParser", "Resilient parsing for category ${this.id}: ${e.message}")
        parseCategoryDtoManual(this)
    }
}

fun parseCategoryDtoManual(doc: com.google.firebase.firestore.DocumentSnapshot): CategoryDto {
    val restId = doc.getString("restaurantId") ?: doc.getString("businessId") ?: doc.getString("comercioId") ?: ""
    val name = doc.getString("primaryName") ?: doc.getString("name") ?: doc.getString("nombre") ?: doc.getString("categoria") ?: "Categoría"
    val desc = doc.getString("description") ?: doc.getString("descripcion") ?: ""
    val imgUrl = doc.getString("imageUrl") ?: doc.getString("imagenUrl") ?: ""
    val orderIdx = (doc.get("orderIndex") as? Number)?.toInt() ?: 0
    val activeVal = doc.getBoolean("isActive") ?: doc.getBoolean("active") ?: true
    val scheduleId = doc.getString("availabilityScheduleId")

    val createdLong = when (val valAny = doc.get("createdAt")) {
        is Number -> valAny.toLong()
        is com.google.firebase.Timestamp -> valAny.seconds * 1000L
        is String -> valAny.toLongOrNull() ?: 0L
        else -> 0L
    }
    val updatedLong = when (val valAny = doc.get("updatedAt")) {
        is Number -> valAny.toLong()
        is com.google.firebase.Timestamp -> valAny.seconds * 1000L
        is String -> valAny.toLongOrNull() ?: 0L
        else -> 0L
    }

    return CategoryDto(
        id = doc.id,
        restaurantId = restId,
        primaryName = name,
        description = desc,
        imageUrl = imgUrl,
        orderIndex = orderIdx,
        isActive = activeVal,
        availabilityScheduleId = scheduleId,
        createdAt = createdLong,
        updatedAt = updatedLong
    )
}
