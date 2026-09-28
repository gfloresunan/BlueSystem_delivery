package com.example.presentation.customer.favorites

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class FavoriteProductItem(
    val productId: String = "",
    val businessId: String = "",
    val businessName: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val imageUrl: String = "",
    val category: String = "",
    val addedAt: Timestamp? = null
)
