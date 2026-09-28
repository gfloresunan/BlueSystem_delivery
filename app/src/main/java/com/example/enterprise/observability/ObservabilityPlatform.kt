package com.example.enterprise.observability

data class TraceContext(
    val traceId: String = "tr_${System.currentTimeMillis()}_${(1000..9999).random()}",
    val spanId: String = "sp_${(1000..9999).random()}",
    val parentSpanId: String? = null
)

interface IObservabilityProvider {
    fun logInfo(tag: String, message: String, traceContext: TraceContext? = null)
    fun logError(tag: String, message: String, throwable: Throwable? = null, traceContext: TraceContext? = null)
    fun recordMetric(metricName: String, value: Double, tags: Map<String, String> = emptyMap())
}

class GcpObservabilityProvider : IObservabilityProvider {
    private val logsMemory = mutableListOf<String>()
    private val metricsMemory = mutableListOf<Pair<String, Double>>()

    override fun logInfo(tag: String, message: String, traceContext: TraceContext?) {
        val entry = "INFO [$tag] [Trace: ${traceContext?.traceId ?: "NONE"}] $message"
        logsMemory.add(entry)
    }

    override fun logError(tag: String, message: String, throwable: Throwable?, traceContext: TraceContext?) {
        val entry = "ERROR [$tag] [Trace: ${traceContext?.traceId ?: "NONE"}] $message - ${throwable?.message}"
        logsMemory.add(entry)
    }

    override fun recordMetric(metricName: String, value: Double, tags: Map<String, String>) {
        metricsMemory.add(Pair(metricName, value))
    }

    fun getLogsCount(): Int = logsMemory.size
    fun getMetricsCount(): Int = metricsMemory.size
}

/**
 * Servidor Enterprise: ObservabilityPlatform (Pilar 7).
 * Fachada central de observabilidad con trazabilidad distribuida (TraceId, SpanId).
 */
class ObservabilityPlatform(
    private val provider: IObservabilityProvider = GcpObservabilityProvider()
) {
    fun logInfo(tag: String, message: String, traceContext: TraceContext? = null) = provider.logInfo(tag, message, traceContext)
    fun logError(tag: String, message: String, throwable: Throwable? = null, traceContext: TraceContext? = null) = provider.logError(tag, message, throwable, traceContext)
    fun recordMetric(metricName: String, value: Double, tags: Map<String, String> = emptyMap()) = provider.recordMetric(metricName, value, tags)
}
