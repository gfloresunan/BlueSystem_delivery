package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: AvailabilityScheduleDto (v2.2 Enterprise)
 */
data class AvailabilityScheduleDto(
    @get:PropertyName("id") @set:PropertyName("id") var id: String = "",
    @get:PropertyName("restaurantId") @set:PropertyName("restaurantId") var restaurantId: String = "",
    @get:PropertyName("branchId") @set:PropertyName("branchId") var branchId: String? = null,
    @get:PropertyName("name") @set:PropertyName("name") var name: String = "",
    @get:PropertyName("weeklySchedules") @set:PropertyName("weeklySchedules") var weeklySchedules: List<DayScheduleDto> = emptyList(),
    @get:PropertyName("isTemporaryPaused") @set:PropertyName("isTemporaryPaused") var isTemporaryPaused: Boolean = false,
    @get:PropertyName("pausedUntilTimestamp") @set:PropertyName("pausedUntilTimestamp") var pausedUntilTimestamp: Long? = null,
    @get:PropertyName("pauseReason") @set:PropertyName("pauseReason") var pauseReason: String? = null,
    @get:PropertyName("createdAt") @set:PropertyName("createdAt") var createdAt: Long = 0L,
    @get:PropertyName("updatedAt") @set:PropertyName("updatedAt") var updatedAt: Long = 0L
)
