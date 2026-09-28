package com.example.domain.model.finance

data class TopProductFinance(
    val productId: String,
    val productName: String,
    val categoryName: String,
    val unitsSold: Int,
    val totalRevenue: Double,
    val revenueSharePercent: Double
)
