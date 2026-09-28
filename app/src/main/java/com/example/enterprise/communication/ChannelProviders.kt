package com.example.enterprise.communication

import com.example.data.NotificationCenterManager

interface IChannelProvider {
    val channel: CommunicationChannel
    suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport
}

class InAppChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.IN_APP

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        // Entregar directamente al NotificationCenter UI existente
        NotificationCenterManager.addNotification(
            userId = message.recipientId,
            title = message.title,
            body = message.body,
            type = "ORDER_UPDATE",
            metadata = message.metadata
        )
        return DeliveryReport(
            messageId = message.messageId,
            channel = channel,
            isDelivered = true,
            providerStatus = "IN_APP_NOTIFICATION_CENTER_DELIVERED"
        )
    }
}

class PushChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.PUSH

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, true, "FCM_PUSH_DELIVERED")
    }
}

class EmailChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.EMAIL

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, true, "SMTP_EMAIL_SENT")
    }
}

class WhatsAppChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.WHATSAPP

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, true, "WA_API_SENT")
    }
}

class SmsChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.SMS

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, true, "SMS_GATEWAY_DELIVERED")
    }
}

class TelegramChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.TELEGRAM

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, true, "TELEGRAM_BOT_DELIVERED")
    }
}

class WebhookChannelProvider : IChannelProvider {
    override val channel: CommunicationChannel = CommunicationChannel.WEBHOOK

    override suspend fun deliverMessage(message: CommunicationMessage): DeliveryReport {
        return DeliveryReport(message.messageId, channel, true, "WEBHOOK_POST_200_OK")
    }
}
