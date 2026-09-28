package com.example.presentation.customer.profile

data class OrderItem(
    val productId: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val imageUrl: String = "",
    val subtotal: Double = 0.0,
    val selectedOptions: List<com.example.domain.model.menu.SelectedOption> = emptyList()
)

data class Review(
    val id: String = "",
    val orderId: String = "",
    val businessId: String = "",
    val customerId: String = "",
    val courierId: String = "",
    val businessRating: Int = 0,
    val courierRating: Int = 0,
    val comments: String = "",
    val timestamp: com.google.firebase.Timestamp? = null
)
