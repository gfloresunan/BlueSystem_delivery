package com.example.enterprise.integration

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IntegrationHubTest {

    private val hub = IntegrationHub()

    @Test
    fun `test IntegrationHub dispatches WhatsApp and Stripe actions successfully`() = runBlocking {
        val waResult = hub.dispatchExternalAction("conn_whatsapp", "SEND_NOTIFICATION", mapOf("phone" to "+50588888888"))
        assertTrue(waResult.isSuccess)
        assertEquals("SENT", waResult.getOrNull()?.get("status"))

        val stripeResult = hub.dispatchExternalAction("conn_stripe", "CHARGE", mapOf("amount" to 25.0))
        assertTrue(stripeResult.isSuccess)
        assertEquals("PAID", stripeResult.getOrNull()?.get("status"))
    }

    @Test
    fun `test IntegrationHub dispatches BAC LAFISE and QuickBooks actions`() = runBlocking {
        val bacResult = hub.dispatchExternalAction("conn_bac_lafise", "AUTHORIZE", mapOf("card" to "4111..."))
        assertTrue(bacResult.isSuccess)
        assertEquals("APPROVED", bacResult.getOrNull()?.get("status"))

        val qbResult = hub.dispatchExternalAction("conn_quickbooks", "CREATE_INVOICE", mapOf("orderId" to "o123"))
        assertTrue(qbResult.isSuccess)
        assertEquals("SYNCED", qbResult.getOrNull()?.get("status"))
    }
}
