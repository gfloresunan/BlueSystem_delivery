package com.example.enterprise.communication.advanced

import com.example.enterprise.communication.CommunicationChannel
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UserPreferenceCenterTest {

    private val preferenceCenter = UserPreferenceCenter()

    @Test
    fun `test granular category x channel preference evaluation`() {
        val prefs = UserCommunicationPreferences(
            userId = "user_777",
            categoryPreferences = mapOf(
                NotificationCategory.ORDERS to setOf(CommunicationChannel.WHATSAPP, CommunicationChannel.IN_APP),
                NotificationCategory.PROMOTIONS to setOf(CommunicationChannel.EMAIL)
            )
        )

        preferenceCenter.setPreferences(prefs)

        // Pedidos permitidos en WhatsApp pero no en SMS
        assertTrue(preferenceCenter.isChannelAllowed("user_777", NotificationCategory.ORDERS, CommunicationChannel.WHATSAPP))
        assertFalse(preferenceCenter.isChannelAllowed("user_777", NotificationCategory.ORDERS, CommunicationChannel.SMS))

        // Promociones permitidas solo en Email
        assertTrue(preferenceCenter.isChannelAllowed("user_777", NotificationCategory.PROMOTIONS, CommunicationChannel.EMAIL))
        assertFalse(preferenceCenter.isChannelAllowed("user_777", NotificationCategory.PROMOTIONS, CommunicationChannel.PUSH))
    }
}
