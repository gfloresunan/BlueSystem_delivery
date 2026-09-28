package com.example.dashboard

import com.example.domain.model.dashboard.DashboardGoal
import org.junit.Assert.*
import org.junit.Test

class DailyGoalWidgetTest {

    @Test
    fun testDailyGoalProgressPercentage() {
        val goal = DashboardGoal(targetAmount = 5000.0, currentAmount = 3400.0)
        assertEquals(68.0f, goal.progressPercentage, 0.1f)
    }
}
