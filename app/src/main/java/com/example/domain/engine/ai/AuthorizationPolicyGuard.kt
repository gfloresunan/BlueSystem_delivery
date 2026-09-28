package com.example.domain.engine.ai

import com.example.domain.model.ai.*

/**
 * Decisión de Autorización de Ejecución
 */
sealed interface AuthorizationDecision {
    data class Authorized(val tool: AIToolDefinition) : AuthorizationDecision
    data class Denied(val error: AIError, val status: ToolResultStatus) : AuthorizationDecision
}

/**
 * Guardián de Políticas de Autorización en Tiempo de Ejecución (v2.2 Enterprise)
 *
 * Frontera de seguridad estricta previa al despacho de cualquier herramienta:
 * - Valida existencia canónica en ToolRegistry
 * - Valida plano de ejecución permitido
 * - Valida autenticación real de sesión
 * - Valida confirmación física independiente (Confirmation Gate)
 * - Rechaza herramientas de Nivel 4 y Nivel 5 en el cliente
 */
object AuthorizationPolicyGuard {

    private val ALLOWED_LOCAL_PLANES = setOf(ToolExecutionPlane.LOCAL, ToolExecutionPlane.LOCAL_BACKEND)

    fun authorizeInvocation(
        toolId: String,
        parameters: Map<String, Any?>,
        context: LocalExecutionContext,
        registry: ToolRegistry = ToolRegistry
    ): AuthorizationDecision {
        // 1. Verificar existencia en el Registro Canónico
        val tool = registry.getTool(toolId)
        if (tool == null) {
            return AuthorizationDecision.Denied(
                error = AIError(
                    code = AIErrorCode.TOOL_NOT_ELIGIBLE,
                    userMessage = "Herramienta no registrada en el sistema: '$toolId'."
                ),
                status = ToolResultStatus.UNAUTHORIZED
            )
        }

        // 2. Verificar plano de ejecución permitido para despacho local
        if (!ALLOWED_LOCAL_PLANES.contains(tool.executionPlane)) {
            return AuthorizationDecision.Denied(
                error = AIError(
                    code = AIErrorCode.UNAUTHORIZED,
                    userMessage = "La herramienta '$toolId' pertenece al plano ${tool.executionPlane} y no puede ejecutarse localmente."
                ),
                status = ToolResultStatus.UNAUTHORIZED
            )
        }

        // 3. Prohibición estricta de Nivel 4 (Financiero) y Nivel 5 (Prohibido)
        if (tool.authorizationLevel == ToolAuthorizationLevel.LEVEL_4_SERVER_FINANCIAL_MUTATION ||
            tool.authorizationLevel == ToolAuthorizationLevel.LEVEL_5_FORBIDDEN_TO_AI) {
            return AuthorizationDecision.Denied(
                error = AIError(
                    code = AIErrorCode.UNAUTHORIZED,
                    userMessage = "La herramienta '$toolId' requiere autorización de servidor o está prohibida para ejecución local."
                ),
                status = ToolResultStatus.UNAUTHORIZED
            )
        }

        // 4. Verificar requerimiento de autenticación
        if (tool.requiresAuthentication && !context.isAuthenticated) {
            return AuthorizationDecision.Denied(
                error = AIError(
                    code = AIErrorCode.AUTH_REQUIRED,
                    userMessage = "Se requiere iniciar sesión para ejecutar '${tool.description}'."
                ),
                status = ToolResultStatus.UNAUTHORIZED
            )
        }

        // 5. Verificar requerimiento de confirmación (Level 3 - Confirmation Gate)
        if (tool.requiresConfirmation && !context.confirmedByUser) {
            return AuthorizationDecision.Denied(
                error = AIError(
                    code = AIErrorCode.CONFIRMATION_REQUIRED,
                    userMessage = "La operación '${tool.toolId}' requiere confirmación explícita del usuario.",
                    requiresClarification = true,
                    suggestedAction = "REQUEST_CONFIRMATION"
                ),
                status = ToolResultStatus.REQUIRES_CONFIRMATION
            )
        }

        // Autorizado para ejecución
        return AuthorizationDecision.Authorized(tool)
    }
}
