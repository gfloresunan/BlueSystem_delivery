package com.example.domain.model.ai

/**
 * Categorías Canónicas de Errores de IA (Controlados y Sanitizados)
 */
enum class AIErrorCode {
    PRODUCT_NOT_FOUND,
    BUSINESS_NOT_FOUND,
    UNAUTHORIZED,
    AUTH_REQUIRED,
    ORDER_NOT_FOUND,
    ORDER_NOT_ACTIVE,
    TRACKING_UNAVAILABLE,
    AMBIGUOUS_ENTITY,
    REQUIRED_OPTIONS_MISSING,
    CART_CONFLICT,
    COUPON_INVALID,
    CONFIRMATION_REQUIRED,
    TOOL_NOT_ELIGIBLE,
    INVALID_ARGUMENT,
    NETWORK_ERROR,
    OFFLINE,
    RATE_LIMITED,
    INTERNAL_ERROR
}

/**
 * Representación tipada y sanitizada de un error de ejecución o validación de IA.
 * Protege al cliente de stack traces o rutas internas de base de datos.
 */
data class AIError(
    val code: AIErrorCode,
    val userMessage: String,
    val technicalReason: String = "",
    val recoverable: Boolean = true,
    val requiresClarification: Boolean = false,
    val suggestedAction: String? = null
)

/**
 * Estados del resultado de ejecución de una herramienta.
 */
enum class ToolResultStatus {
    COMPLETED,
    FAILED,
    REQUIRES_CONFIRMATION,
    REQUIRES_DISAMBIGUATION,
    UNAUTHORIZED
}

/**
 * Envoltorio Unificado de Resultado de Herramienta (ToolResult).
 * Preserva la separación estricta: RAW TOOL OUTPUT ≠ SANITIZED LLM CONTEXT.
 */
data class ToolResult(
    val toolId: String,
    val status: ToolResultStatus,
    val success: Boolean,
    val sanitizedLlmContext: String,
    val rawOutputSummary: String = "",
    val uiPayload: Map<String, String> = emptyMap(),
    val cards: List<AICard> = emptyList(),
    val error: AIError? = null
)
