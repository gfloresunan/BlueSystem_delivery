package com.example.enterprise.communication

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CommunicationOrchestratorTest {

    private val orchestrator = CommunicationOrchestrator()

    @Test
    fun `test CommunicationOrchestrator dispatches message through IN_APP and PUSH`() = runBlocking {
        val msg = CommunicationMessage(
            recipientId = "user_abc",
            title = "Title",
            body = "Body",
            channels = listOf(CommunicationChannel.IN_APP, CommunicationChannel.PUSH)
        )

        val reports = orchestrator.dispatchMessage(msg)
        assertEquals(2, reports.size)
        assertTrue(reports.all { it.isDelivered })
    }
}
