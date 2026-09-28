package com.example.settings

import com.example.domain.model.settings.WeeklySchedule
import org.junit.Assert.*
import org.junit.Test

class ScheduleEngineTest {

    @Test
    fun testWeeklyScheduleDefaults() {
        val schedule = WeeklySchedule()
        assertTrue(schedule.monday.isOpen)
        assertEquals("08:00 AM", schedule.monday.openTime)
    }
}
