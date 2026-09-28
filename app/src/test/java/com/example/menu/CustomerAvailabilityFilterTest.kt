package com.example.menu

import com.example.domain.engine.menu.CustomerAvailabilityFilter
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.DaySchedule
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.TimeRange
import java.time.DayOfWeek
import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CustomerAvailabilityFilterTest {

    @Test
    fun `test filterProducts marks products as unavailable outside active schedule`() {
        val range = TimeRange(startTime = "07:00", endTime = "11:00")
        val day = DaySchedule(dayOfWeek = DayOfWeek.TUESDAY, timeRanges = listOf(range), isOpen = true)
        val schedule = AvailabilitySchedule(id = "sched_bf", weeklySchedules = listOf(day))

        val productBreakfast = MenuProduct(
            id = "p_pancakes",
            name = "Pancakes con Miel",
            availabilityScheduleId = "sched_bf",
            status = MenuProductStatus.ACTIVE
        )

        // Martes 02:00 PM (Fuera de horario 07:00-11:00)
        val TuesdayAfternoon = LocalDateTime.of(2026, 7, 28, 14, 0) // 28 Julio 2026 es Martes
        val filtered = CustomerAvailabilityFilter.filterProducts(
            products = listOf(productBreakfast),
            schedulesMap = mapOf("sched_bf" to schedule),
            currentDateTime = TuesdayAfternoon
        )

        assertEquals(1, filtered.size)
        assertFalse("Los pancakes no deben estar disponibles por la tarde", filtered.first().isAvailableForOrder)
        assertEquals("OUTSIDE_OPERATIONAL_HOURS", filtered.first().unavailableReason)
    }
}
