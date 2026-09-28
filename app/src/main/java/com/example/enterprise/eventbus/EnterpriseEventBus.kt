package com.example.enterprise.eventbus

typealias EventSubscriber<T> = suspend (T) -> Unit

/**
 * Servidor Enterprise: EnterpriseEventBus (Pilar 6).
 * Bus de eventos desacoplado en memoria con soporte pub/sub asíncrono para eventos de dominio.
 */
class EnterpriseEventBus {

    private val subscribers = mutableMapOf<Class<*>, MutableList<EventSubscriber<Any>>>()

    @Suppress("UNCHECKED_CAST")
    fun <T : Any> subscribe(eventType: Class<T>, subscriber: EventSubscriber<T>) {
        val list = subscribers.getOrPut(eventType) { mutableListOf() }
        list.add(subscriber as EventSubscriber<Any>)
    }

    suspend fun <T : Any> publish(event: T) {
        val eventType = event::class.java
        val list = subscribers[eventType] ?: return
        list.forEach { subscriber ->
            try {
                subscriber(event)
            } catch (e: Exception) {
                e.printStackTrace()
                throw e
            }
        }
    }

    fun clearSubscribers() {
        subscribers.clear()
    }
}
