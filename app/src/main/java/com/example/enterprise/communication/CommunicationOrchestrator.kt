package com.example.enterprise.communication

import com.example.enterprise.featureflags.FeatureFlagEngine
import com.example.enterprise.observability.ObservabilityPlatform
import com.example.enterprise.observability.TraceContext

/**
 * Servidor Enterprise: CommunicationOrchestrator.
 * Orquestador principal multicanal de entrega, rate limiting, evaluación de feature flags y observabilidad.
 */
class CommunicationOrchestrator(
    private val featureFlagEngine: FeatureFlagEngine = FeatureFlagEngine(),
    private val observabilityPlatform: ObservabilityPlatform = ObservabilityPlatform()
) {

    private val providersMap = mutableMapOf<CommunicationChannel, IChannelProvider>()

    init {
        registerProvider(InAppChannelProvider())
        registerProvider(PushChannelProvider())
        registerProvider(EmailChannelProvider())
        registerProvider(WhatsAppChannelProvider())
        registerProvider(SmsChannelProvider())
        registerProvider(TelegramChannelProvider())
        registerProvider(WebhookChannelProvider())
    }

    fun registerProvider(provider: IChannelProvider) {
        providersMap[provider.channel] = provider
    }

    suspend fun dispatchMessage(
        message: CommunicationMessage,
        traceContext: TraceContext? = null
    ): List<DeliveryReport> {
        val reports = mutableListOf<DeliveryReport>()

        message.channels.forEach { channel ->
            // Evaluación de Feature Flag por canal (ej. EnableWhatsApp)
            val flagKey = "Enable_${channel.name}"
            val isChannelEnabled = featureFlagEngine.isFeatureEnabled(flagKey, defaultIfUnregistered = true)

            if (!isChannelEnabled && channel != CommunicationChannel.IN_APP) {
                observabilityPlatform.logInfo(
                    "COMMUNICATION",
                    "Canal ${channel.name} desactivado por Feature Flag",
                    traceContext
                )
                return@forEach
            }

            val provider = providersMap[channel]
            if (provider != null) {
                val report = provider.deliverMessage(message)
                reports.add(report)
                observabilityPlatform.recordMetric("communication_delivery_${channel.name.lowercase()}", 1.0)
            }
        }

        return reports
    }
}
