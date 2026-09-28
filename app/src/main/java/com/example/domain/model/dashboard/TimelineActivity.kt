package com.example.domain.model.dashboard

enum class ActivityType {
    ORDER_RECEIVED,
    ORDER_ACCEPTED,
    ORDER_READY,
    COURIER_ASSIGNED,
    ORDER_DELIVERED,
    PROMOTION_CREATED,
    STOCK_PAUSED,
    REVIEW_RECEIVED
}

data class TimelineActivity(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val type: ActivityType = ActivityType.ORDER_RECEIVED,
    val timestamp: Long = System.currentTimeMillis()
)
