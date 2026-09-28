package com.example.domain.model

import com.google.firebase.Timestamp

data class BusinessAnalytics(
    val businessId: String = "",
    val todayRevenue: Double = 0.0,
    val todayOrders: Int = 0,
    val weekRevenue: Double = 0.0,
    val weekOrders: Int = 0,
    val monthRevenue: Double = 0.0,
    val monthOrders: Int = 0,
    val topProducts: List<TopProduct> = emptyList(),
    val peakHours: List<PeakHour> = emptyList(),
    val dailyStats: List<DailyStat> = emptyList(),
    val lastUpdated: Timestamp = Timestamp.now()
)

data class TopProduct(
    val productId: String = "",
    val productName: String = "",
    val totalSold: Int = 0,
    val totalRevenue: Double = 0.0,
    val imageUrl: String = ""
)

data class PeakHour(
    val hour: Int = 0, // 0-23
    val orderCount: Int = 0
)

data class DailyStat(
    val date: Timestamp = Timestamp.now(),
    val revenue: Double = 0.0,
    val orders: Int = 0,
    val averageOrderValue: Double = 0.0
)
