package com.example.enterprise.communication

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ChannelProvidersTest {

    @Test
    fun `test all 7 channel providers deliver messages successfully`() = runBlocking {
        val providers: List<IChannelProvider> = listOf(
            InAppChannelProvider(),
            PushChannelProvider(),
            EmailChannelProvider(),
            WhatsAppChannelProvider(),
            SmsChannelProvider(),
            TelegramChannelProvider(),
            WebhookChannelProvider()
        )

        val msg = CommunicationMessage(recipientId = "user1", title = "Test Title", body = "Test Body")

        providers.forEach { provider ->
            val report = provider.deliverMessage(msg)
            assertTrue("Provider ${provider.channel} debe entregar el mensaje", report.isDelivered)
            assertEquals(msg.messageId, report.messageId)
        }
    }
}
