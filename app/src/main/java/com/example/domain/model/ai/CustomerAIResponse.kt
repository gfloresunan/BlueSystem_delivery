package com.example.domain.model.ai

/**
 * Desglose Financiero Autoritativo para el Diálogo de Confirmación (Level 3 / Level 4)
 * INVARIANTE: Generado por el backend o el CartManager autoritativo, NUNCA inventado por el LLM.
 */
data class FinancialBreakdown(
    val subtotal: Double,
    val deliveryFee: Double = 0.0,
    val discount: Double = 0.0,
    val total: Double,
    val currency: String = "C$"
)

/**
 * Propuesta de Confirmación Pendiente (Confirmation Gate)
 * Requiere interacción física del usuario antes de proceder con mutaciones destructivas o financieras.
 */
data class PendingConfirmation(
    val confirmationNonce: String,
    val actionType: AIActionType,
    val summaryText: String,
    val financialBreakdown: FinancialBreakdown? = null,
    val expiresAtTimestamp: Long = 0L
)

/**
 * Contrato de Respuesta Top-Level: CustomerAIResponse
 * Retornado a la interfaz conversacional del cliente.
 */
data class CustomerAIResponse(
    val responseId: String,
    val conversationId: String,
    val message: String,
    val cards: List<AICard> = emptyList(),
    val actions: List<AIAction> = emptyList(),
    val confirmationRequired: Boolean = false,
    val pendingConfirmation: PendingConfirmation? = null,
    val serverTimestamp: Long = System.currentTimeMillis()
)
