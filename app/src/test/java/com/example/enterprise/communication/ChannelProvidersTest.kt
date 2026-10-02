package com.example.enterprise.communication

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChannelProvidersTest {

    @Test
    fun `test active channels deliver and unimplemented channels report NOT_IMPLEMENTED honestly`() = runBlocking {
        val activeProviders: List<IChannelProvider> = listOf(
            InAppChannelProvider(),
            PushChannelProvider(),
            EmailChannelProvider()
        )

        val unimplementedProviders: List<IChannelProvider> = listOf(
            WhatsAppChannelProvider(),
            SmsChannelProvider(),
            TelegramChannelProvider(),
            WebhookChannelProvider()
        )

        val msg = CommunicationMessage(recipientId = "user1", title = "Test Title", body = "Test Body")

        // Canales activos (Push, InApp, Email)
        activeProviders.forEach { provider ->
            val report = provider.deliverMessage(msg)
            assertTrue("Provider activo ${provider.channel} debe entregar el mensaje", report.isDelivered)
            assertEquals(msg.messageId, report.messageId)
        }

        // Canales no implementados deben reportar false y NOT_IMPLEMENTED (P4-02: Zero False Success)
        unimplementedProviders.forEach { provider ->
            val report = provider.deliverMessage(msg)
            assertFalse("Provider no implementado ${provider.channel} NO debe simular éxito falso", report.isDelivered)
            assertEquals("NOT_IMPLEMENTED", report.providerStatus)
            assertEquals(msg.messageId, report.messageId)
        }
    }
}

