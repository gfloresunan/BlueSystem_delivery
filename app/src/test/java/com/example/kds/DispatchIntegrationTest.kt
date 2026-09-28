package com.example.kds

import com.example.domain.engine.kds.DispatchIntegrationSimulatorImpl
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DispatchIntegrationTest {

    private val dispatch = DispatchIntegrationSimulatorImpl()

    @Test
    fun `test assignDriver creates assignment`() = runBlocking {
        val assignment = dispatch.assignDriver("o1", "d1")

        assertEquals("o1", assignment.orderId)
        assertEquals("d1", assignment.driverId)
        assertEquals("ASSIGNED", assignment.status)
    }

    @Test
    fun `test dispatch lifecycle calls return true`() = runBlocking {
        assertTrue(dispatch.driverAccepted("o1", "d1"))
        assertTrue(dispatch.pickedUp("o1"))
        assertTrue(dispatch.delivered("o1"))
    }
}
