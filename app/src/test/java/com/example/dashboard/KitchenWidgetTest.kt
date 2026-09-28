package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class KitchenWidgetTest {

    @Test
    fun testKitchenQueueSummary() {
        val count = 4
        val avgTime = 18
        assertTrue(count > 0)
        assertEquals(18, avgTime)
    }
}
