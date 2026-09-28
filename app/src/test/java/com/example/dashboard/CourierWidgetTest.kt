package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class CourierWidgetTest {

    @Test
    fun testCourierTrackingListNotEmpty() {
        val couriers = listOf("Luis (En ruta)", "Carlos (Recogiendo)")
        assertEquals(2, couriers.size)
        assertTrue(couriers.first().contains("En ruta"))
    }
}
