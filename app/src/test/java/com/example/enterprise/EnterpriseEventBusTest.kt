package com.example.enterprise

import com.example.enterprise.eventbus.EnterpriseEventBus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

data class SampleDomainEvent(val message: String)

class EnterpriseEventBusTest {

    private val bus = EnterpriseEventBus()

    @Test
    fun `test publish and subscribe domain events`() = runBlocking {
        var receivedMessage = ""

        bus.subscribe(SampleDomainEvent::class.java) { evt ->
            receivedMessage = evt.message
        }

        bus.publish(SampleDomainEvent("OrderCreated"))

        assertEquals("OrderCreated", receivedMessage)
    }
}
