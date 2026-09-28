package com.example.domain.model.ai

/**
 * Tipos Canónicos de Acciones de IA para Navegación y UI
 * Son puramente DECLARATIVOS; no ejecutan mutaciones directamente.
 */
enum class AIActionType {
    OPEN_PRODUCT,
    OPEN_BUSINESS,
    OPEN_CART,
    OPEN_CHECKOUT,
    OPEN_ORDER,
    OPEN_TRACKING,
    OPEN_ADDRESS_MANAGER,
    RENDER_PRODUCT_CARD,
    RENDER_TRACKING_CARD,
    REQUEST_ORDER_CONFIRMATION,
    REQUEST_CANCEL_CONFIRMATION
}

/**
 * Contrato de Acción Emitida por la Capa de IA para ser consumida por la UI / NavHost.
 */
data class AIAction(
    val actionId: String,
    val actionType: AIActionType,
    val targetRoute: String? = null,
    val parameters: Map<String, String> = emptyMap(),
    val requiresConfirmation: Boolean = false,
    val requiresAuthentication: Boolean = false
)
