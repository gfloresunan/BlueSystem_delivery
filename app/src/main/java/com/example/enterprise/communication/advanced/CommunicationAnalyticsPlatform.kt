package com.example.enterprise.communication.advanced

import com.example.enterprise.communication.CommunicationChannel

data class CommunicationEventRecord(
    val messageId: String,
    val channel: CommunicationChannel,
    val isSent: Boolean = true,
    val isDelivered: Boolean = true,
    val isOpened: Boolean = false,
    val isClicked: Boolean = false,
    val isBounced: Boolean = false,
    val deliveryTimeMs: Long = 50L
)

data class AnalyticsSummaryReport(
    val totalSent: Int,
    val deliveryRate: Double,
    val openRate: Double,
    val clickRate: Double,
    val bounceRate: Double,
    val avgDeliveryTimeMs: Long,
    val mostEffectiveChannel: CommunicationChannel
)

/**
 * Servidor Enterprise: CommunicationAnalyticsPlatform.
 * Motor de métricas avanzadas de efectividad de comunicaciones (Open Rate, Click Rate, Bounce Rate).
 */
class CommunicationAnalyticsPlatform {

    private val records = mutableListOf<CommunicationEventRecord>()

    fun recordEvent(event: CommunicationEventRecord) {
        records.add(event)
    }

    fun generateReport(): AnalyticsSummaryReport {
        if (records.isEmpty()) {
            return AnalyticsSummaryReport(0, 0.0, 0.0, 0.0, 0.0, 0L, CommunicationChannel.IN_APP)
        }

        val total = records.size
        val deliveredCount = records.count { it.isDelivered }
        val openedCount = records.count { it.isOpened }
        val clickedCount = records.count { it.isClicked }
        val bouncedCount = records.count { it.isBounced }

        val deliveryRate = (deliveredCount.toDouble() / total.toDouble()) * 100.0
        val openRate = (openedCount.toDouble() / total.toDouble()) * 100.0
        val clickRate = (clickedCount.toDouble() / total.toDouble()) * 100.0
        val bounceRate = (bouncedCount.toDouble() / total.toDouble()) * 100.0

        val avgDeliveryTime = records.sumOf { it.deliveryTimeMs } / total

        // Encontrar el canal más efectivo (mayor número de lecturas/aperturas)
        val channelOpens = records.filter { it.isOpened }.groupBy { it.channel }
        val topChannel = channelOpens.maxByOrNull { it.value.size }?.key ?: CommunicationChannel.WHATSAPP

        return AnalyticsSummaryReport(
            totalSent = total,
            deliveryRate = deliveryRate,
            openRate = openRate,
            clickRate = clickRate,
            bounceRate = bounceRate,
            avgDeliveryTimeMs = avgDeliveryTime,
            mostEffectiveChannel = topChannel
        )
    }
}
