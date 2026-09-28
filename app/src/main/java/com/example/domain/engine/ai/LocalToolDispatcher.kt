package com.example.domain.engine.ai

import com.example.domain.model.ai.AIError
import com.example.domain.model.ai.AIErrorCode
import com.example.domain.model.ai.ToolResult
import com.example.domain.model.ai.ToolResultStatus

/**
 * Despachador Seguro de Herramientas Locales: LocalToolDispatcher (v2.2 Enterprise)
 *
 * Coordina la cadena de ejecución local:
 * Request → AuthorizationPolicyGuard → LocalToolAdapter → Sanitization → ToolResult
 *
 * INVARIANTE:
 * - Toda ejecución pasa obligatoriamente por el AuthorizationPolicyGuard.
 * - Rechaza herramientas de backend o no locales con un ToolResult seguro, sin excepciones.
 */
class LocalToolDispatcher(
    adapters: List<LocalToolAdapter>,
    private val policyGuard: AuthorizationPolicyGuard = AuthorizationPolicyGuard
) {
    private val adapterMap: Map<String, LocalToolAdapter> = adapters.associateBy { it.toolId }

    /**
     * Despacha la ejecución de una herramienta local de manera segura y sanitizada.
     */
    suspend fun dispatch(
        toolId: String,
        parameters: Map<String, Any?>,
        context: LocalExecutionContext
    ): ToolResult {
        // 1. Paso por el Guardián de Autorización
        val decision = policyGuard.authorizeInvocation(toolId, parameters, context)
        when (decision) {
            is AuthorizationDecision.Denied -> {
                return ToolResult(
                    toolId = toolId,
                    status = decision.status,
                    success = false,
                    sanitizedLlmContext = decision.error.userMessage,
                    error = decision.error
                )
            }
            is AuthorizationDecision.Authorized -> {
                // 2. Localizar el adaptador correspondiente
                val adapter = adapterMap[toolId]
                if (adapter == null) {
                    return ToolResult(
                        toolId = toolId,
                        status = ToolResultStatus.FAILED,
                        success = false,
                        sanitizedLlmContext = "No existe un adaptador local registrado para la herramienta: '$toolId'.",
                        error = AIError(
                            code = AIErrorCode.INTERNAL_ERROR,
                            userMessage = "Adaptador local no configurado."
                        )
                    )
                }

                // 3. Ejecutar el adaptador de forma segura
                return try {
                    adapter.execute(parameters, context)
                } catch (e: Exception) {
                    // Sanitización de excepciones: Nunca exponer stack traces al LLM
                    ToolResult(
                        toolId = toolId,
                        status = ToolResultStatus.FAILED,
                        success = false,
                        sanitizedLlmContext = "Ocurrió un error al ejecutar la operación solicitada.",
                        error = AIError(
                            code = AIErrorCode.INTERNAL_ERROR,
                            userMessage = "Error interno de ejecución",
                            technicalReason = e.javaClass.simpleName
                        )
                    )
                }
            }
        }
    }

    /**
     * Retorna la lista de identificadores de herramientas que cuentan con adaptador local registrado.
     */
    fun getRegisteredLocalToolIds(): Set<String> = adapterMap.keys
}
