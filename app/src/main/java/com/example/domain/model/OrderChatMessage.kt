package com.example.domain.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName
import com.google.firebase.firestore.ServerTimestamp

enum class ChatDomain {
    COMMERCE_ORDER,
    X_TO_Y_TRIP
}

enum class OrderChatSenderRole {
    CUSTOMER,
    COURIER,
    SYSTEM
}

enum class OrderChatMessageType {
    TEXT,
    SYSTEM,
    CALL_EVENT
}

enum class OrderChatMessageStatus {
    SENT,
    DELIVERED,
    READ
}

@IgnoreExtraProperties
data class OrderChatMessage(
    val id: String = "",
    val orderId: String = "",
    val tripId: String = "",
    val domain: String = ChatDomain.COMMERCE_ORDER.name,
    val senderId: String = "",
    val senderRole: String = OrderChatSenderRole.CUSTOMER.name, // "CUSTOMER", "COURIER", "SYSTEM"
    val senderNameSnapshot: String = "",
    val senderName: String = "",
    val text: String = "",
    val type: String = OrderChatMessageType.TEXT.name, // "TEXT", "SYSTEM", "CALL_EVENT"
    @ServerTimestamp
    val createdAt: Timestamp? = null,
    val readAt: Timestamp? = null,
    val readBy: List<String> = emptyList(),
    val status: String = OrderChatMessageStatus.SENT.name, // "SENT", "DELIVERED", "READ"
    val tenantId: String = "",
    val businessId: String = "",
    // Local ephemeral properties (not persisted)
    @get:com.google.firebase.firestore.Exclude
    val isPendingSync: Boolean = false,
    @get:com.google.firebase.firestore.Exclude
    val isFailed: Boolean = false
) {
    @get:com.google.firebase.firestore.Exclude
    val conversationId: String
        get() = tripId.ifBlank { orderId }

    @get:com.google.firebase.firestore.Exclude
    val effectiveSenderName: String
        get() = senderNameSnapshot.ifBlank { senderName.ifBlank { if (senderRole == "COURIER") "Motorizado" else "Cliente" } }
}
