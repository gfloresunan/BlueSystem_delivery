package com.example.domain.engine.ai

/**
 * Contexto de Ejecución Local Seguro (v2.2 Enterprise)
 *
 * Encapsula el estado verificado de autenticación, sesión y confirmación
 * en el cliente Android.
 *
 * INVARIANTE DE SEGURIDAD:
 * - currentUserId se obtiene exclusivamente de la sesión nativa de Firebase Auth,
 *   NUNCA a partir de parámetros proporcionados por el LLM.
 * - confirmedByUser es una señal explícita del pipeline de confirmación (Gate),
 *   NUNCA inferida de texto en lenguaje natural.
 */
data class LocalExecutionContext(
    val isAuthenticated: Boolean = false,
    val currentUserId: String? = null,
    val isGuest: Boolean = false,
    val confirmedByUser: Boolean = false,
    val activeAddressLabel: String? = null,
    val customerLat: Double? = null,
    val customerLng: Double? = null,
    val activeOrderId: String? = null
)
