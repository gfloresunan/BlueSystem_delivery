package com.example.domain.engine.menu

import java.util.concurrent.atomic.AtomicLong

data class TelemetrySnapshot(
    val totalCalculations: Long,
    val totalExecutionTimeMs: Long,
    val averageExecutionTimeMs: Double,
    val totalVariantsEvaluated: Long,
    val totalOptionsProcessed: Long
)

/**
 * Telemetría del Motor de Precios (PricingTelemetry - Sprint 13B.4C)
 *
 * Mide el rendimiento de cálculo de precios, número de variantes y opciones procesadas.
 */
object PricingTelemetry {

    private val calculationCount = AtomicLong(0)
    private val totalTimeMs = AtomicLong(0)
    private val variantsEvaluatedCount = AtomicLong(0)
    private val optionsProcessedCount = AtomicLong(0)

    fun recordCalculation(
        timeMs: Long,
        variantsCount: Int = 0,
        optionsCount: Int = 0
    ) {
        calculationCount.incrementAndGet()
        totalTimeMs.addAndGet(timeMs)
        variantsEvaluatedCount.addAndGet(variantsCount.toLong())
        optionsProcessedCount.addAndGet(optionsCount.toLong())
    }

    fun getSnapshot(): TelemetrySnapshot {
        val count = calculationCount.get()
        val totalMs = totalTimeMs.get()
        val avg = if (count > 0) totalMs.toDouble() / count else 0.0

        return TelemetrySnapshot(
            totalCalculations = count,
            totalExecutionTimeMs = totalMs,
            averageExecutionTimeMs = avg,
            totalVariantsEvaluated = variantsEvaluatedCount.get(),
            totalOptionsProcessed = optionsProcessedCount.get()
        )
    }

    fun reset() {
        calculationCount.set(0)
        totalTimeMs.set(0)
        variantsEvaluatedCount.set(0)
        optionsProcessedCount.set(0)
    }
}
