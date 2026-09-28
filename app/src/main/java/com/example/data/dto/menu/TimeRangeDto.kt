package com.example.data.dto.menu

import com.google.firebase.firestore.PropertyName

/**
 * DTO de Firestore: TimeRangeDto (v2.2 Enterprise)
 */
data class TimeRangeDto(
    @get:PropertyName("startTime") @set:PropertyName("startTime") var startTime: String = "00:00",
    @get:PropertyName("endTime") @set:PropertyName("endTime") var endTime: String = "23:59"
)
