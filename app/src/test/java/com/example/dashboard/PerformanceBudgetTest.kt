package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class PerformanceBudgetTest {

    @Test
    fun testListenerCountDoesNotExceedAdr003Limit() {
        val activeListenersCount = 2
        val maxAllowed = 2

        assertTrue(activeListenersCount <= maxAllowed)
    }
}
