package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class Promotion(
    val id: String = "",
    val businessId: String = "",
    val title: String = "",
    val description: String = "",
    val image: String = "",
    val active: Boolean = true,
    val discountPercentage: Double = 0.0,
    val couponCode: String = "",
    val minOrderAmount: Double = 0.0,
    val priority: Int = 0,
    val startDate: String = "",
    val endDate: String = ""
)

