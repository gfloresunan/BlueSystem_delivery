package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class Coupon(
    val id: String = "",
    val code: String = "",
    val discountPercent: Double = 0.0,
    val discountAmount: Double = 0.0,
    val minOrderAmount: Double = 0.0,
    val active: Boolean = true,
    val expiryDate: String = "",
    val description: String = ""
)
