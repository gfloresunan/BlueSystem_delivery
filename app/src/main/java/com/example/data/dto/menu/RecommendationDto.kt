package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class RecommendationDto(
    var id: String = "",
    var restaurantId: String = "",
    var sourceProductId: String = "",
    var recommendedProductId: String = "",
    var score: Double = 1.0,
    var reason: String = "POPULAR_PAIR"
)
