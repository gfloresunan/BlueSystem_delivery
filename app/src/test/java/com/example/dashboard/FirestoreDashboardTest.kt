package com.example.dashboard

import com.example.data.repository.BusinessInfo
import org.junit.Assert.*
import org.junit.Test

class FirestoreDashboardTest {

    @Test
    fun testBusinessInfoMapping() {
        val info = BusinessInfo(
            id = "biz_001",
            nombre = "Restaurante Central",
            isOpen = true
        )

        assertEquals("biz_001", info.id)
        assertTrue(info.isOpen)
    }
}
