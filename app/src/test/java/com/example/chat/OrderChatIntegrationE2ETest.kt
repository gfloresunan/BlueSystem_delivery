package com.example.chat

import com.example.domain.model.OrderChatMessage
import com.example.domain.model.OrderChatMessageStatus
import com.example.domain.model.OrderChatMessageType
import com.example.domain.model.OrderChatSenderRole
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Suite de Pruebas Unitarias Android: BSD-CHAT-CUSTOMER-COURIER-E2E-001
 * Valida el contrato de datos del Chat, resolución de nombres, roles de interlocutores,
 * eventos de llamada y mitigación de mensajes huérfanos.
 */
class OrderChatIntegrationE2ETest {

    @Test
    fun testChatMessage_CustomerRole_EffectiveNameResolution() {
        val message = OrderChatMessage(
            id = "msg_001",
            orderId = "ord_test_123",
            senderId = "uid_customer_01",
            senderRole = OrderChatSenderRole.CUSTOMER.name,
            senderNameSnapshot = "Gerald Cliente",
            senderName = "Gerald",
            text = "¿Dónde se encuentra actualmente?",
            type = OrderChatMessageType.TEXT.name,
            status = OrderChatMessageStatus.SENT.name,
            tenantId = "tenant_01",
            businessId = "biz_01"
        )

        assertEquals("Gerald Cliente", message.effectiveSenderName)
        assertEquals(OrderChatSenderRole.CUSTOMER.name, message.senderRole)
        assertEquals(OrderChatMessageType.TEXT.name, message.type)
        assertEquals(OrderChatMessageStatus.SENT.name, message.status)
        assertFalse(message.isPendingSync)
    }

    @Test
    fun testChatMessage_CourierRole_FallbackNameResolution() {
        val message = OrderChatMessage(
            id = "msg_002",
            orderId = "ord_test_123",
            senderId = "uid_courier_01",
            senderRole = OrderChatSenderRole.COURIER.name,
            senderNameSnapshot = "",
            senderName = "",
            text = "Llegando a la puerta",
            type = OrderChatMessageType.TEXT.name,
            status = OrderChatMessageStatus.READ.name,
            readBy = listOf("uid_courier_01", "uid_customer_01")
        )

        assertEquals("Motorizado", message.effectiveSenderName)
        assertTrue(message.readBy.contains("uid_customer_01"))
        assertEquals("READ", message.status)
    }

    @Test
    fun testChatMessage_CallEvent_RenderingModel() {
        val callMessage = OrderChatMessage(
            id = "call_001",
            orderId = "ord_test_123",
            senderId = "uid_customer_01",
            senderRole = OrderChatSenderRole.CUSTOMER.name,
            senderNameSnapshot = "Cliente",
            text = "📞 Cliente inició llamada al motorizado",
            type = OrderChatMessageType.CALL_EVENT.name,
            status = OrderChatMessageStatus.SENT.name
        )

        assertEquals(OrderChatMessageType.CALL_EVENT.name, callMessage.type)
        assertTrue(callMessage.text.contains("inició llamada"))
    }

    @Test
    fun testChatMessage_EphemeralState_PendingSync() {
        val offlineMessage = OrderChatMessage(
            id = "msg_offline_01",
            orderId = "ord_test_123",
            senderId = "uid_customer_01",
            senderRole = OrderChatSenderRole.CUSTOMER.name,
            text = "Mensaje enviado sin conexión",
            isPendingSync = true
        )

        assertTrue(offlineMessage.isPendingSync)
        assertFalse(offlineMessage.isFailed)
    }

    @Test
    fun testChatMessage_RoleIntegrity() {
        assertEquals("CUSTOMER", OrderChatSenderRole.CUSTOMER.name)
        assertEquals("COURIER", OrderChatSenderRole.COURIER.name)
        assertEquals("SYSTEM", OrderChatSenderRole.SYSTEM.name)
    }

    @Test
    fun testChatMessage_StatusIntegrity() {
        assertEquals("SENT", OrderChatMessageStatus.SENT.name)
        assertEquals("DELIVERED", OrderChatMessageStatus.DELIVERED.name)
        assertEquals("READ", OrderChatMessageStatus.READ.name)
    }

    @Test
    fun testChatDomain_EnumAndCollectionResolution() {
        assertEquals("COMMERCE_ORDER", com.example.domain.model.ChatDomain.COMMERCE_ORDER.name)
        assertEquals("X_TO_Y_TRIP", com.example.domain.model.ChatDomain.X_TO_Y_TRIP.name)

        val commerceCol = com.example.data.repository.OrderChatRepository.getParentCollectionName(com.example.domain.model.ChatDomain.COMMERCE_ORDER)
        val xyCol = com.example.data.repository.OrderChatRepository.getParentCollectionName(com.example.domain.model.ChatDomain.X_TO_Y_TRIP)

        assertEquals("orders", commerceCol)
        assertEquals("deliveryTrips", xyCol)
    }

    @Test
    fun testChatMessage_XYTripDomain_ConversationIdResolution() {
        val xyMessage = OrderChatMessage(
            id = "msg_xy_001",
            tripId = "trip_KAQMU8",
            domain = com.example.domain.model.ChatDomain.X_TO_Y_TRIP.name,
            senderId = "uid_courier_01",
            senderRole = OrderChatSenderRole.COURIER.name,
            senderNameSnapshot = "Carlos Motorizado",
            text = "Voy en camino al punto de recogida X"
        )

        assertEquals("trip_KAQMU8", xyMessage.conversationId)
        assertEquals("X_TO_Y_TRIP", xyMessage.domain)
        assertEquals("Carlos Motorizado", xyMessage.effectiveSenderName)
    }

    @Test
    fun testChatMessage_CommerceDomain_ConversationIdResolution() {
        val commerceMessage = OrderChatMessage(
            id = "msg_ord_001",
            orderId = "ord_COMMERCE_999",
            domain = com.example.domain.model.ChatDomain.COMMERCE_ORDER.name,
            senderId = "uid_customer_01",
            senderRole = OrderChatSenderRole.CUSTOMER.name,
            senderNameSnapshot = "Ana Cliente",
            text = "Por favor dejar en recepción"
        )

        assertEquals("ord_COMMERCE_999", commerceMessage.conversationId)
        assertEquals("COMMERCE_ORDER", commerceMessage.domain)
        assertEquals("Ana Cliente", commerceMessage.effectiveSenderName)
    }
}
