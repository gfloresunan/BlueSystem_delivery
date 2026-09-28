package com.example.dashboard

import com.example.domain.model.dashboard.DashboardProfileType
import com.example.domain.model.dashboard.DashboardSnapshot
import org.junit.Assert.*
import org.junit.Test

class DashboardSnapshotTest {

    @Test
    fun testDashboardSnapshotCreation() {
        val snapshot = DashboardSnapshot(
            userId = "user_001",
            businessId = "biz_001",
            activeProfile = DashboardProfileType.KITCHEN
        )

        assertEquals("user_001", snapshot.userId)
        assertEquals(DashboardProfileType.KITCHEN, snapshot.activeProfile)
    }
}
