package com.example.menu

import com.example.data.mapper.menu.AvailabilityMapper
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.DaySchedule
import com.example.domain.model.menu.TimeRange
import java.time.DayOfWeek
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AvailabilityMapperTest {

    @Test
    fun `test AvailabilityMapper bidirectional conversion between DTO and Domain`() {
        val range = TimeRange(startTime = "12:00", endTime = "16:00")
        val day = DaySchedule(dayOfWeek = DayOfWeek.FRIDAY, timeRanges = listOf(range), isOpen = true)

        val schedule = AvailabilitySchedule(
            id = "sched_almuerzo",
            restaurantId = "rest_01",
            branchId = "branch_norte",
            name = "Horario Almuerzo Viernes",
            weeklySchedules = listOf(day),
            isTemporaryPaused = true,
            pauseReason = "Mantenimiento cocina"
        )

        val dto = AvailabilityMapper.scheduleToDto(schedule)
        val mappedDomain = AvailabilityMapper.scheduleToDomain(dto)

        assertEquals(schedule.id, mappedDomain.id)
        assertEquals("branch_norte", mappedDomain.branchId)
        assertTrue(mappedDomain.isTemporaryPaused)
        assertEquals("Mantenimiento cocina", mappedDomain.pauseReason)
        assertEquals(DayOfWeek.FRIDAY, mappedDomain.weeklySchedules.first().dayOfWeek)
        assertEquals("12:00", mappedDomain.weeklySchedules.first().timeRanges.first().startTime)
    }
}
