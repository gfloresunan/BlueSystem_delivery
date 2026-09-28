package com.example.domain.engine.ai

import com.example.domain.model.ai.AIToolDefinition
import com.example.domain.model.ai.ToolAuthorizationLevel
import com.example.domain.model.ai.ToolExecutionPlane
import com.example.domain.model.ai.ToolRegistry

/**
 * Motor de Elegibilidad Dinámica de Herramientas (v2.2 Enterprise)
 *
 * Responsabilidad ÚNICA:
 * Determinar qué herramientas del registro son elegibles para la sesión actual del cliente,
 * previniendo que Gemini reciba definiciones de herramientas no autorizadas.
 *
 * NO ejecuta herramientas.
 */
object ToolEligibilityEngine {

    /**
     * Evalúa las herramientas elegibles para el contexto de sesión actual.
     *
     * @param context Contexto verificado de sesión local.
     * @param registry Registro canónico de herramientas (por defecto ToolRegistry).
     * @param allowedPlanes Planos de ejecución permitidos (por defecto LOCAL y LOCAL_BACKEND).
     * @return Lista inmutable de herramientas autorizadas para esta sesión.
     */
    fun evaluateEligibleTools(
        context: LocalExecutionContext,
        registry: ToolRegistry = ToolRegistry,
        allowedPlanes: Set<ToolExecutionPlane> = setOf(ToolExecutionPlane.LOCAL, ToolExecutionPlane.LOCAL_BACKEND)
    ): List<AIToolDefinition> {
        return registry.getAllTools().filter { tool ->
            // 1. Filtrar por plano de ejecución permitido
            if (!allowedPlanes.contains(tool.executionPlane)) {
                return@filter false
            }

            // 2. Evaluar nivel de autorización y estado de autenticación
            when (tool.authorizationLevel) {
                ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ -> {
                    // Público: Siempre elegible (invitados y autenticados)
                    true
                }
                ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ -> {
                    // Si requiere autenticación, validar que esté autenticado
                    if (tool.requiresAuthentication) context.isAuthenticated else true
                }
                ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION -> {
                    // Mutaciones de cliente: si requiere autenticación, validar
                    if (tool.requiresAuthentication) context.isAuthenticated else true
                }
                ToolAuthorizationLevel.LEVEL_3_USER_CONFIRMATION_REQUIRED -> {
                    // Destructivo local (clear_cart): Elegible en sesión (el guard verificará confirmación en ejecución)
                    if (tool.requiresAuthentication) context.isAuthenticated else true
                }
                ToolAuthorizationLevel.LEVEL_4_SERVER_FINANCIAL_MUTATION -> {
                    // Nivel 4 NUNCA es elegible para el plano local
                    false
                }
                ToolAuthorizationLevel.LEVEL_5_FORBIDDEN_TO_AI -> {
                    // Prohibido absolutamente
                    false
                }
            }
        }
    }

    /**
     * Verifica si una herramienta específica es elegible en el contexto dado.
     */
    fun isToolEligible(
        toolId: String,
        context: LocalExecutionContext,
        registry: ToolRegistry = ToolRegistry
    ): Boolean {
        val eligibleTools = evaluateEligibleTools(context, registry)
        return eligibleTools.any { it.toolId == toolId }
    }
}
