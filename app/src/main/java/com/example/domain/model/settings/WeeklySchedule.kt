package com.example.domain.model.settings

data class DayShift(
    val openTime: String = "08:00 AM",
    val closeTime: String = "10:00 PM",
    val isOpen: Boolean = true
)

data class WeeklySchedule(
    val monday: DayShift = DayShift(),
    val tuesday: DayShift = DayShift(),
    val wednesday: DayShift = DayShift(),
    val thursday: DayShift = DayShift(),
    val friday: DayShift = DayShift(),
    val saturday: DayShift = DayShift(openTime = "09:00 AM", closeTime = "11:00 PM"),
    val sunday: DayShift = DayShift(openTime = "09:00 AM", closeTime = "09:00 PM")
)
