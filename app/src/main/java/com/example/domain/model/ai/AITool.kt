package com.example.domain.model.ai

/**
 * Planos de Ejecución Formales para AI Tools (C1-R1 / C2-B)
 */
enum class ToolExecutionPlane {
    LOCAL,
    BACKEND,
    LOCAL_BACKEND,
    PRESENTATION
}

/**
 * Niveles Canónicos de Autorización de Seguridad (Level 0 a Level 5)
 */
enum class ToolAuthorizationLevel {
    LEVEL_0_PUBLIC_READ,
    LEVEL_1_AUTH_CUSTOMER_READ,
    LEVEL_2_AUTH_CUSTOMER_MUTATION,
    LEVEL_3_USER_CONFIRMATION_REQUIRED,
    LEVEL_4_SERVER_FINANCIAL_MUTATION,
    LEVEL_5_FORBIDDEN_TO_AI
}

/**
 * Clasificación de Capacidad del Subsistema
 */
enum class CapabilityClassification {
    EXISTING_CAPABILITY,
    PROPOSED_AI_CAPABILITY,
    REQUIRES_BACKEND_ADAPTER,
    REQUIRES_CLIENT_ADAPTER
}

/**
 * Definición Canónica de Metadata para una AI Tool en el Registro.
 */
data class AIToolDefinition(
    val toolId: String,
    val description: String,
    val executionPlane: ToolExecutionPlane,
    val authorizationLevel: ToolAuthorizationLevel,
    val capabilityClassification: CapabilityClassification,
    val requiresConfirmation: Boolean = false,
    val requiresAuthentication: Boolean = false,
    val sourceReference: String = ""
)
