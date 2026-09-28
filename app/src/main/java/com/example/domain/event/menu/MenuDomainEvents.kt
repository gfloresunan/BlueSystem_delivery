package com.example.domain.event.menu

sealed interface MenuDomainEvent {
    val eventId: String
    val timestamp: Long
}

data class ProductAvailabilityChanged(
    override val eventId: String = java.util.UUID.randomUUID().toString(),
    override val timestamp: Long = System.currentTimeMillis(),
    val productId: String,
    val restaurantId: String,
    val branchId: String? = null,
    val isAvailable: Boolean,
    val reason: String
) : MenuDomainEvent

data class ScheduleActivated(
    override val eventId: String = java.util.UUID.randomUUID().toString(),
    override val timestamp: Long = System.currentTimeMillis(),
    val scheduleId: String,
    val scheduleName: String,
    val restaurantId: String
) : MenuDomainEvent

data class ScheduleExpired(
    override val eventId: String = java.util.UUID.randomUUID().toString(),
    override val timestamp: Long = System.currentTimeMillis(),
    val scheduleId: String,
    val scheduleName: String,
    val restaurantId: String
) : MenuDomainEvent

data class StockDepleted(
    override val eventId: String = java.util.UUID.randomUUID().toString(),
    override val timestamp: Long = System.currentTimeMillis(),
    val productId: String,
    val variantKey: String? = null,
    val restaurantId: String,
    val branchId: String? = null
) : MenuDomainEvent

data class RestaurantOpened(
    override val eventId: String = java.util.UUID.randomUUID().toString(),
    override val timestamp: Long = System.currentTimeMillis(),
    val restaurantId: String,
    val branchId: String
) : MenuDomainEvent

data class RestaurantClosed(
    override val eventId: String = java.util.UUID.randomUUID().toString(),
    override val timestamp: Long = System.currentTimeMillis(),
    val restaurantId: String,
    val branchId: String,
    val reason: String
) : MenuDomainEvent
