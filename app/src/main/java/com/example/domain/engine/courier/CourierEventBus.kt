package com.example.domain.engine.courier

import com.example.AuditLogger
import com.example.domain.event.CourierDomainEvent
import com.example.domain.model.AuditSeverity
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Enterprise Event Bus para publicar y suscribirse asíncronamente a eventos de dominio.
 */
object CourierEventBus {

    private val _events = MutableSharedFlow<CourierDomainEvent>(
        replay = 100,
        extraBufferCapacity = 200
    )
    val events: SharedFlow<CourierDomainEvent> = _events.asSharedFlow()

    /**
     * Publica un evento de dominio en el Event Bus y notifica automáticamente al sistema de auditoría.
     */
    fun publish(event: CourierDomainEvent) {
        _events.tryEmit(event)

        // Registrar observabilidad automática en auditoría
        AuditLogger.logEvent(
            event = "ENTERPRISE_EVENT_PUBLISHED",
            details = mapOf(
                "eventType" to event.javaClass.simpleName,
                "eventId" to event.eventId,
                "timestampMs" to event.timestampMs
            ),
            severity = AuditSeverity.INFO
        )
    }
}
