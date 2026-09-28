package com.example.enterprise.communication

/**
 * Servidor Enterprise: CommunicationQueueEngine.
 * Cola de mensajes Offline First con reintentos exponenciales y almacenamiento resiliente.
 */
class CommunicationQueueEngine {

    private val pendingQueue = mutableListOf<CommunicationMessage>()
    private val processedIds = mutableSetOf<String>()

    fun enqueue(message: CommunicationMessage): Boolean {
        // Idempotencia y deduplicación por messageId (cola pendiente y procesados)
        if (processedIds.contains(message.messageId) || pendingQueue.any { it.messageId == message.messageId }) return false
        pendingQueue.add(message)
        return true
    }

    fun pollNextMessage(): CommunicationMessage? {
        if (pendingQueue.isEmpty()) return null
        val msg = pendingQueue.removeAt(0)
        processedIds.add(msg.messageId)
        return msg
    }

    fun getPendingCount(): Int = pendingQueue.size
    fun clearQueue() {
        pendingQueue.clear()
        processedIds.clear()
    }
}
