package com.example.domain.engine.telemetry

data class OperationLatencyRecord(
    val operationName: String,
    val durationMs: Long,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Servidor de Dominio: PerformanceMetricsEngine (Objetivo 14).
 * Captura y audita automáticamente latencias de carga de Dashboard, KDS, Menú y Publicación.
 */
class PerformanceMetricsEngine {

    private val latencyRecords = mutableListOf<OperationLatencyRecord>()

    fun <T> measureAndRecord(operationName: String, block: () -> T): T {
        val start = System.currentTimeMillis()
        val result = block()
        val duration = System.currentTimeMillis() - start
        latencyRecords.add(OperationLatencyRecord(operationName, duration))
        return result
    }

    fun getAverageLatencyMs(operationName: String): Long {
        val matches = latencyRecords.filter { it.operationName == operationName }
        if (matches.isEmpty()) return 0L
        return matches.sumOf { it.durationMs } / matches.size
    }

    fun getAllRecords(): List<OperationLatencyRecord> = latencyRecords.toList()
}
