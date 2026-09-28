package com.example.domain.model.ai

/**
 * Categorías Canónicas de Intención de IA (Taxonomía Cerrada C2-A / C2-B)
 * Describe la intención semántica extraída del razonamiento del modelo.
 * NO ejecuta ninguna acción por sí misma.
 */
enum class AIIntentCategory {
    SEARCH_CATALOG,
    RESOLVE_ENTITY,
    GET_CART,
    ADD_TO_CART,
    UPDATE_CART,
    GET_ACTIVE_ORDER,
    GET_ORDER_TRACKING,
    PROPOSE_ORDER_CREATION,
    PROPOSE_ORDER_CANCEL,
    NAVIGATE_TO_SCREEN
}

/**
 * Representación tipada de una intención semántica extraída.
 */
data class AIIntent(
    val category: AIIntentCategory,
    val confidence: Float = 1.0f,
    val extractedParameters: Map<String, String> = emptyMap(),
    val rawUtterance: String = ""
)
