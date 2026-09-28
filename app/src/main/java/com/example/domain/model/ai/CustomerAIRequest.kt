package com.example.domain.model.ai

/**
 * Contrato de Solicitud: CustomerAIRequest (v2.2 Enterprise)
 * Representa el mensaje conversacional y el contexto mínimo verificado del cliente
 * enviado desde la aplicación Android hacia la capa de IA.
 *
 * REQUISITO DE SEGURIDAD:
 * - El Firebase UID NO se suministra como campo de confianza desde el cliente.
 * - No incluye PII sensible (email, teléfono, dirección completa).
 * - La identidad se deriva exclusivamente del token de Firebase Auth verificado.
 */
data class CustomerAIRequest(
    val rawMessage: String,
    val conversationId: String,
    val clientTimestamp: Long = System.currentTimeMillis(),
    val clientContext: CustomerAIClientContext = CustomerAIClientContext()
)

/**
 * Contexto mínimo y sanitizado de la sesión del cliente en el dispositivo.
 */
data class CustomerAIClientContext(
    val activeAddressLabel: String? = null,
    val isGuest: Boolean = false,
    val cartItemCount: Int = 0,
    val cartBusinessId: String? = null,
    val activeOrderId: String? = null
)
