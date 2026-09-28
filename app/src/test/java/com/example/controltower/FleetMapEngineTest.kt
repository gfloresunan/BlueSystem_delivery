package com.example.controltower

import com.example.domain.engine.controltower.FleetMapEngine
import com.example.domain.model.controltower.FleetCourier
import com.example.domain.model.controltower.FleetCourierStatus
import org.junit.Assert.*
import org.junit.Test

class FleetMapEngineTest {

    @Test
    fun testActiveCouriersCountCalculation() {
        val list = listOf(
            FleetCourier("c1", "Luis", status = FleetCourierStatus.AVAILABLE),
            FleetCourier("c2", "Carlos", status = FleetCourierStatus.IN_TRANSIT),
            FleetCourier("c3", "Mario", status = FleetCourierStatus.OFFLINE)
        )

        val activeCount = FleetMapEngine.calculateActiveCouriersCount(list)
        assertEquals(2, activeCount)
    }
}
