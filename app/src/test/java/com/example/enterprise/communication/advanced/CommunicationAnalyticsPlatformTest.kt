package com.example.enterprise.communication.advanced

import com.example.enterprise.communication.CommunicationChannel
import org.junit.Assert.assertEquals
import org.junit.Test

class CommunicationAnalyticsPlatformTest {

    private val analyticsPlatform = CommunicationAnalyticsPlatform()

    @Test
    fun `test analytics computes Open Rate, Delivery Rate and Most Effective Channel`() {
        analyticsPlatform.recordEvent(CommunicationEventRecord("m1", CommunicationChannel.WHATSAPP, isDelivered = true, isOpened = true, isClicked = true))
        analyticsPlatform.recordEvent(CommunicationEventRecord("m2", CommunicationChannel.WHATSAPP, isDelivered = true, isOpened = true))
        analyticsPlatform.recordEvent(CommunicationEventRecord("m3", CommunicationChannel.EMAIL, isDelivered = true, isOpened = false))

        val report = analyticsPlatform.generateReport()

        assertEquals(3, report.totalSent)
        assertEquals(100.0, report.deliveryRate, 0.1) // 3/3 = 100%
        assertEquals(66.6, report.openRate, 0.5)      // 2/3 = 66.6%
        assertEquals(33.3, report.clickRate, 0.5)     // 1/3 = 33.3%
        assertEquals(CommunicationChannel.WHATSAPP, report.mostEffectiveChannel)
    }
}
