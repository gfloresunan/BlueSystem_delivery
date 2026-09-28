package com.example.enterprise.communication

enum class CommunicationChannel {
    IN_APP,
    PUSH,
    EMAIL,
    WHATSAPP,
    SMS,
    TELEGRAM,
    WEBHOOK
}

enum class MessagePriority {
    URGENT,
    HIGH,
    NORMAL,
    LOW
}

data class CommunicationMessage(
    val messageId: String = "msg_${System.currentTimeMillis()}_${(1000..9999).random()}",
    val recipientId: String,
    val title: String,
    val body: String,
    val channels: List<CommunicationChannel> = listOf(CommunicationChannel.IN_APP, CommunicationChannel.PUSH),
    val priority: MessagePriority = MessagePriority.NORMAL,
    val metadata: Map<String, Any> = emptyMap(),
    val createdAt: Long = System.currentTimeMillis()
)

data class DeliveryReport(
    val messageId: String,
    val channel: CommunicationChannel,
    val isDelivered: Boolean,
    val providerStatus: String,
    val timestamp: Long = System.currentTimeMillis()
)
