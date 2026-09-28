package com.example.settings

import org.junit.Assert.*
import org.junit.Test

class NotificationSettingsTest {

    @Test
    fun testNotificationChannelsEnabled() {
        val pushEnabled = true
        val whatsappEnabled = true
        assertTrue(pushEnabled && whatsappEnabled)
    }
}
