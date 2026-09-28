package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class Category(
    val id: String = "",
    val businessId: String = "",
    val name: String = "",
    val slug: String = "",
    val type: String = "BUSINESS", // "BUSINESS" | "PRODUCT"
    val showInHome: Boolean = false,
    val isFeatured: Boolean = false,
    val icon: String = "📁",
    val iconType: String = "EMOJI", // "EMOJI" | "SYSTEM_ICON" | "IMAGE_URL"
    val iconUrl: String = "",
    val imageUrl: String = "",
    val color: String = "#3B82F6",
    val bgColor: String = "#EFF6FF",
    val description: String = "",
    val active: Boolean = true,
    val orderIndex: Int = 0
)


