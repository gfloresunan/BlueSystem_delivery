package com.example.menu

import com.example.domain.model.menu.AvailabilityResult
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.DaySchedule
import com.example.domain.model.menu.TimeRange
import java.time.DayOfWeek
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AvailabilityScheduleTest {

    @Test
    fun `test AvailabilitySchedule construction and weekly schedule composition`() {
        val rangeDesayuno = TimeRange(startTime = "07:00", endTime = "11:00")
        val mondaySchedule = DaySchedule(
            dayOfWeek = DayOfWeek.MONDAY,
            timeRanges = listOf(rangeDesayuno),
            isOpen = true
        )

        val schedule = AvailabilitySchedule(
            id = "sched_desayunos",
            restaurantId = "rest_01",
            name = "Horario Desayunos",
            weeklySchedules = listOf(mondaySchedule),
            isTemporaryPaused = false
        )

        assertEquals("sched_desayunos", schedule.id)
        assertEquals(1, schedule.weeklySchedules.size)
        assertEquals("07:00", schedule.weeklySchedules.first().timeRanges.first().startTime)
    }

    @Test
    fun `test AvailabilityResult output contract`() {
        val result = AvailabilityResult(
            isAvailable = false,
            reason = "PAUSED_UNTIL_30_MIN",
            nextAvailableTime = "11:30",
            isTemporaryPaused = true
        )

        assertFalse(result.isAvailable)
        assertEquals("PAUSED_UNTIL_30_MIN", result.reason)
        assertEquals("11:30", result.nextAvailableTime)
        assertTrue(result.isTemporaryPaused)
    }
}
