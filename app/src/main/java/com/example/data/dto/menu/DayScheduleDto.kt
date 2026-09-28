package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: DayScheduleDto (v2.2 Enterprise)
 */
data class DayScheduleDto(
    @get:PropertyName("dayOfWeek") @set:PropertyName("dayOfWeek") var dayOfWeek: String = "MONDAY",
    @get:PropertyName("timeRanges") @set:PropertyName("timeRanges") var timeRanges: List<TimeRangeDto> = emptyList(),
    @get:PropertyName("isOpen") @set:PropertyName("isOpen") var isOpen: Boolean = true
)
