package com.example.domain.engine.order

/**
 * Gestor de Listeners Efímeros de Pago (Objetivo 6).
 * Elimina listeners permanentes escuchando únicamente pagos en estado PENDING_PAYMENT
 * y desconectando inmediatamente la suscripción al confirmar o cancelar.
 */
class PaymentListenerManager {

    private val activeListeners = mutableMapOf<String, String>() // orderId -> listenerState

    fun attachPendingPaymentListener(orderId: String): Boolean {
        activeListeners[orderId] = "LISTENING_PENDING"
        return true
    }

    fun detachPaymentListenerOnConfirmed(orderId: String): Boolean {
        val exists = activeListeners.containsKey(orderId)
        if (exists) {
            activeListeners.remove(orderId)
        }
        return exists
    }

    fun getActiveListenerCount(): Int = activeListeners.size
}
